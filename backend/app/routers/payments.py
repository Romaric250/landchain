import logging
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, object_id, require_kyc_verified
from app.models.common import serialize, utcnow
from app.models.schemas import ListForSaleRequest, ListingFeeRequest, SubscribeRequest
from app.services import fapshi
from app.services.resend_client import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

PLAN_CONFIG = {
    "monthly": {"days": 30, "price_attr": "PRICE_SUBSCRIPTION_MONTHLY"},
    "quarterly": {"days": 90, "price_attr": "PRICE_SUBSCRIPTION_QUARTERLY"},
    "annual": {"days": 365, "price_attr": "PRICE_SUBSCRIPTION_ANNUAL"},
}


def plan_price(plan: str) -> int:
    return getattr(settings, PLAN_CONFIG[plan]["price_attr"])


@router.get("/plans")
async def plans():
    return {
        "subscription_plans": [
            {"plan": name, "duration_days": cfg["days"], "price_xaf": plan_price(name)}
            for name, cfg in PLAN_CONFIG.items()
        ],
        "listing_fee_xaf": settings.PRICE_LISTING_FEE,
        "listing_duration_days": settings.LISTING_DURATION_DAYS,
        "renewal": "manual",  # Fapshi has no recurring billing (§6.1)
    }


@router.post("/subscribe")
async def subscribe(body: SubscribeRequest, user: Annotated[dict, Depends(get_current_user)]):
    db = get_db()
    amount = plan_price(body.plan)
    redirect = f"{settings.FRONTEND_URL}/{user.get('locale', 'en')}/dashboard/subscription?status=return"
    try:
        pay = await fapshi.initiate_pay(
            amount=amount,
            email=user["email"],
            user_id=str(user["_id"]),
            external_id=f"sub-{body.plan}",
            message=f"LandChain {body.plan} verification subscription",
            redirect_url=redirect,
        )
    except fapshi.FapshiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    now = utcnow()
    await db.payments.insert_one(
        {
            "user_id": user["_id"],
            "type": "subscription",
            "related_id": body.plan,
            "amount_xaf": amount,
            "currency": "XAF",
            "fapshi_trans_id": pay["transId"],
            "fapshi_external_id": f"sub-{body.plan}",
            "status": "PENDING",
            "created_at": now,
            "updated_at": now,
        }
    )
    return {"link": pay["link"], "trans_id": pay["transId"], "amount_xaf": amount}


async def initiate_listing_payment(parcel_id: str, price_xaf: int, user: dict) -> dict:
    """Shared by POST /payments/listing-fee and POST /parcels/:id/list-for-sale."""
    db = get_db()
    parcel = await db.parcels.find_one({"_id": object_id(parcel_id)})
    if parcel is None:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel["current_owner_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Only the owner can list a parcel for sale")
    # Trust rule (§6.2): only verified, non-disputed parcels can be listed
    if parcel["status"] != "active":
        raise HTTPException(status_code=409, detail=f"Parcel is {parcel['status']} — only verified, non-disputed parcels can be listed")
    if (parcel.get("listing") or {}).get("status") == "active":
        raise HTTPException(status_code=409, detail="Parcel already has an active listing")

    amount = settings.PRICE_LISTING_FEE
    redirect = f"{settings.FRONTEND_URL}/{user.get('locale', 'en')}/dashboard/parcels/{parcel_id}?status=return"
    try:
        pay = await fapshi.initiate_pay(
            amount=amount,
            email=user["email"],
            user_id=str(user["_id"]),
            external_id=str(parcel["_id"]),
            message=f"LandChain marketplace listing fee — parcel {parcel['parcel_reference']}",
            redirect_url=redirect,
        )
    except fapshi.FapshiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    now = utcnow()
    result = await db.payments.insert_one(
        {
            "user_id": user["_id"],
            "type": "listing_fee",
            "related_id": str(parcel["_id"]),
            "listing_price_xaf": price_xaf,
            "amount_xaf": amount,
            "currency": "XAF",
            "fapshi_trans_id": pay["transId"],
            "fapshi_external_id": str(parcel["_id"]),
            "status": "PENDING",
            "created_at": now,
            "updated_at": now,
        }
    )
    await db.parcels.update_one(
        {"_id": parcel["_id"]},
        {"$set": {"listing.payment_id": result.inserted_id, "listing.price_xaf": price_xaf, "updated_at": now}},
    )
    return {"link": pay["link"], "trans_id": pay["transId"], "amount_xaf": amount}


@router.post("/listing-fee")
async def listing_fee(body: ListingFeeRequest, user: Annotated[dict, Depends(require_kyc_verified)]):
    db = get_db()
    parcel = await db.parcels.find_one({"_id": object_id(body.parcel_id)})
    price = (parcel or {}).get("listing", {}).get("price_xaf") or 0
    if price <= 0:
        raise HTTPException(status_code=400, detail="Set an asking price via /parcels/:id/list-for-sale first")
    return await initiate_listing_payment(body.parcel_id, price, user)


# Spec §13.3 route shape — initiates listing with the asking price
listing_router = APIRouter(prefix="/parcels", tags=["payments"])


@listing_router.post("/{parcel_id}/list-for-sale")
async def list_for_sale(
    parcel_id: str,
    body: ListForSaleRequest,
    user: Annotated[dict, Depends(require_kyc_verified)],
):
    return await initiate_listing_payment(parcel_id, body.price_xaf, user)


async def _grant_entitlement(payment: dict, background: BackgroundTasks) -> None:
    """Apply the entitlement for a SUCCESSFUL payment. Idempotency is handled
    by the caller (only invoked on a PENDING→SUCCESSFUL transition, §22)."""
    db = get_db()
    now = utcnow()
    user = await db.users.find_one({"_id": payment["user_id"]})

    if payment["type"] == "subscription":
        plan = payment["related_id"]
        days = PLAN_CONFIG[plan]["days"]
        current = (user or {}).get("subscription") or {}
        # Extend from current expiry if still active, else from now
        base = current.get("expires_at")
        if base is None or base.replace(tzinfo=base.tzinfo or now.tzinfo) < now:
            base = now
        expires = base + timedelta(days=days)
        await db.users.update_one(
            {"_id": payment["user_id"]},
            {"$set": {
                "subscription": {
                    "plan": plan, "status": "active",
                    "started_at": now, "expires_at": expires,
                    "last_payment_id": payment["_id"],
                    "reminder_7d_sent": False, "reminder_1d_sent": False,
                },
                "updated_at": now,
            }},
        )
        details = f"Subscription plan: {plan}, valid until {expires.strftime('%Y-%m-%d')}."
    else:  # listing_fee
        parcel_id = object_id(payment["related_id"])
        expires = now + timedelta(days=settings.LISTING_DURATION_DAYS)
        await db.parcels.update_one(
            {"_id": parcel_id},
            {"$set": {
                "listing.is_for_sale": True,
                "listing.status": "active",
                "listing.listed_at": now,
                "listing.expires_at": expires,
                "listing.reminder_sent": False,
                "updated_at": now,
            }},
        )
        details = f"Your parcel is now live on the marketplace until {expires.strftime('%Y-%m-%d')}."

    if user:
        background.add_task(
            send_email, user["email"], "payment_successful", user.get("locale", "en"),
            amount=str(payment["amount_xaf"]), details=details,
        )


@router.post("/webhook")
async def fapshi_webhook(
    request: Request,
    background: BackgroundTasks,
    x_wh_secret: Annotated[str | None, Header(alias="x-wh-secret")] = None,
):
    # Verify webhook secret before trusting anything (§14.4)
    if not fapshi.verify_webhook_secret(x_wh_secret):
        raise HTTPException(status_code=403, detail="Invalid webhook secret")

    payload = await request.json()
    trans_id = payload.get("transId")
    new_status = payload.get("status")
    if not trans_id or new_status not in ("SUCCESSFUL", "FAILED", "EXPIRED"):
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    db = get_db()
    # Idempotent transition: only PENDING payments move to a final state (§22)
    payment = await db.payments.find_one_and_update(
        {"fapshi_trans_id": trans_id, "status": "PENDING"},
        {"$set": {"status": new_status, "updated_at": utcnow(), "fapshi_payload": payload}},
    )
    if payment is None:
        existing = await db.payments.find_one({"fapshi_trans_id": trans_id})
        if existing is None:
            logger.warning("Webhook for unknown transId=%s", trans_id)
        return {"received": True, "applied": False}

    if new_status == "SUCCESSFUL":
        await _grant_entitlement(payment, background)
    else:
        user = await db.users.find_one({"_id": payment["user_id"]})
        if user:
            background.add_task(
                send_email, user["email"], "payment_failed", user.get("locale", "en"),
                amount=str(payment["amount_xaf"]),
            )
    return {"received": True, "applied": True}


@router.get("/history")
async def payment_history(user: Annotated[dict, Depends(get_current_user)]):
    db = get_db()
    cursor = db.payments.find({"user_id": user["_id"]}).sort("created_at", -1)
    return {"items": [serialize(p, exclude={"fapshi_payload"}) async for p in cursor]}


@router.get("/{trans_id}/status")
async def check_status(trans_id: str, background: BackgroundTasks, user: Annotated[dict, Depends(get_current_user)]):
    """Manual fallback check (§14.5) — webhook remains the source of truth."""
    db = get_db()
    payment = await db.payments.find_one({"fapshi_trans_id": trans_id, "user_id": user["_id"]})
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment["status"] != "PENDING":
        return {"trans_id": trans_id, "status": payment["status"]}

    try:
        remote = await fapshi.payment_status(trans_id)
    except fapshi.FapshiError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    remote_status = remote.get("status")
    if remote_status in ("SUCCESSFUL", "FAILED", "EXPIRED"):
        updated = await db.payments.find_one_and_update(
            {"fapshi_trans_id": trans_id, "status": "PENDING"},
            {"$set": {"status": remote_status, "updated_at": utcnow()}},
        )
        if updated and remote_status == "SUCCESSFUL":
            await _grant_entitlement(updated, background)
        return {"trans_id": trans_id, "status": remote_status}
    return {"trans_id": trans_id, "status": payment["status"]}
