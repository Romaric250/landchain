from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app.core.database import get_db
from app.core.deps import object_id, require_admin, require_super_admin
from app.models.common import serialize, utcnow
from app.models.schemas import (
    DisputeUpdateRequest,
    DocumentReviewRequest,
    KycReviewRequest,
    ParcelAdminUpdateRequest,
    ThemeSettings,
    UserAdminUpdateRequest,
)
from app.services.resend_client import send_email

router = APIRouter(prefix="/admin", tags=["admin"])


async def log_action(admin: dict, action: str, target_type: str, target_id: str, notes: str = "") -> None:
    """Every mutating admin action is audited (§18)."""
    await get_db().admin_logs.insert_one(
        {
            "admin_id": admin["_id"],
            "admin_email": admin["email"],
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "notes": notes,
            "created_at": utcnow(),
        }
    )


# ---------------------------------------------------------------- Dashboard

@router.get("/dashboard")
async def dashboard(admin: Annotated[dict, Depends(require_admin)]):
    db = get_db()
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    revenue_pipeline = [
        {"$match": {"status": "SUCCESSFUL", "created_at": {"$gte": month_start}}},
        {"$group": {"_id": "$type", "total": {"$sum": "$amount_xaf"}, "count": {"$sum": 1}}},
    ]
    revenue = {row["_id"]: {"total_xaf": row["total"], "count": row["count"]} async for row in db.payments.aggregate(revenue_pipeline)}

    return {
        "total_users": await db.users.count_documents({}),
        "kyc_pending": await db.kyc_submissions.count_documents({"status": "pending"}),
        "flagged_documents": await db.documents.count_documents({"human_review_status": "pending"}),
        "active_subscriptions": await db.users.count_documents({"subscription.status": "active"}),
        "total_parcels": await db.parcels.count_documents({}),
        "active_listings": await db.parcels.count_documents({"listing.status": "active"}),
        "open_disputes": await db.disputes.count_documents({"status": {"$in": ["open", "under_review"]}}),
        "waitlist_count": await db.waitlist_entries.count_documents({}),
        "monthly_revenue": revenue,
    }


# ---------------------------------------------------------------- Users

@router.get("/users")
async def list_users(
    admin: Annotated[dict, Depends(require_admin)],
    q: str | None = None,
    role: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    skip: int = Query(0, ge=0),
):
    db = get_db()
    query: dict = {}
    if q:
        query["$or"] = [{"email": {"$regex": q, "$options": "i"}}, {"name": {"$regex": q, "$options": "i"}}]
    if role:
        query["role"] = role
    if status_filter:
        query["status"] = status_filter
    cursor = db.users.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = [serialize(u, exclude={"password_hash"}) async for u in cursor]
    return {"items": items, "total": await db.users.count_documents(query)}


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: UserAdminUpdateRequest,
    admin: Annotated[dict, Depends(require_admin)],
):
    db = get_db()
    target = await db.users.find_one({"_id": object_id(user_id)})
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    updates: dict = {}
    if body.role is not None:
        # Only super admins can grant/revoke admin roles (§5)
        if body.role in ("admin", "super_admin") or target["role"] in ("admin", "super_admin"):
            if admin["role"] != "super_admin":
                raise HTTPException(status_code=403, detail="Only super admins can manage admin roles")
        updates["role"] = body.role
    if body.status is not None:
        updates["status"] = body.status
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    updates["updated_at"] = utcnow()
    await db.users.update_one({"_id": target["_id"]}, {"$set": updates})
    await log_action(admin, "update_user", "user", user_id, notes=str(updates))
    return serialize(await db.users.find_one({"_id": target["_id"]}), exclude={"password_hash"})


# ---------------------------------------------------------------- KYC queue

@router.get("/kyc/pending")
async def kyc_pending(admin: Annotated[dict, Depends(require_admin)]):
    db = get_db()
    cursor = db.kyc_submissions.find({"status": "pending"}).sort("created_at", 1)
    items = []
    async for sub in cursor:
        data = serialize(sub)
        user = await db.users.find_one({"_id": sub["user_id"]})
        data["user"] = serialize(user, exclude={"password_hash"}) if user else None
        items.append(data)
    return {"items": items}


async def _review_kyc(submission_id: str, decision: str, notes: str, admin: dict, background: BackgroundTasks):
    db = get_db()
    sub = await db.kyc_submissions.find_one({"_id": object_id(submission_id), "status": "pending"})
    if sub is None:
        raise HTTPException(status_code=404, detail="Pending submission not found")
    now = utcnow()
    await db.kyc_submissions.update_one(
        {"_id": sub["_id"]},
        {"$set": {"status": decision, "reviewed_by": admin["_id"], "review_notes": notes, "reviewed_at": now}},
    )
    await db.users.update_one(
        {"_id": sub["user_id"]},
        {"$set": {"kyc_status": decision, "updated_at": now}},
    )
    user = await db.users.find_one({"_id": sub["user_id"]})
    if user:
        template = "kyc_approved" if decision == "verified" else "kyc_rejected"
        kwargs = {} if decision == "verified" else {"reason": notes or "Not specified"}
        background.add_task(send_email, user["email"], template, user.get("locale", "en"), **kwargs)
    await log_action(admin, f"kyc_{decision}", "kyc_submission", submission_id, notes)
    return {"message": f"KYC {decision}"}


@router.post("/kyc/{submission_id}/approve")
async def approve_kyc(
    submission_id: str,
    body: KycReviewRequest,
    background: BackgroundTasks,
    admin: Annotated[dict, Depends(require_admin)],
):
    return await _review_kyc(submission_id, "verified", body.notes, admin, background)


@router.post("/kyc/{submission_id}/reject")
async def reject_kyc(
    submission_id: str,
    body: KycReviewRequest,
    background: BackgroundTasks,
    admin: Annotated[dict, Depends(require_admin)],
):
    return await _review_kyc(submission_id, "rejected", body.notes, admin, background)


# ---------------------------------------------------------------- Document review queue

@router.get("/documents/flagged")
async def flagged_documents(admin: Annotated[dict, Depends(require_admin)]):
    db = get_db()
    cursor = db.documents.find({"human_review_status": "pending"}).sort("created_at", 1)
    items = []
    async for doc in cursor:
        data = serialize(doc)
        uploader = await db.users.find_one({"_id": doc["uploaded_by"]})
        data["uploader"] = {"name": uploader["name"], "email": uploader["email"]} if uploader else None
        if doc.get("parcel_id"):
            parcel = await db.parcels.find_one({"_id": doc["parcel_id"]})
            data["parcel_reference"] = parcel["parcel_reference"] if parcel else None
        items.append(data)
    return {"items": items}


@router.post("/documents/{document_id}/review")
async def review_document(
    document_id: str,
    body: DocumentReviewRequest,
    background: BackgroundTasks,
    admin: Annotated[dict, Depends(require_admin)],
):
    db = get_db()
    doc = await db.documents.find_one({"_id": object_id(document_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.documents.update_one(
        {"_id": doc["_id"]},
        {"$set": {"human_review_status": body.decision, "reviewed_by": admin["_id"], "review_notes": body.notes}},
    )
    uploader = await db.users.find_one({"_id": doc["uploaded_by"]})
    if uploader:
        background.add_task(
            send_email, uploader["email"], "document_review", uploader.get("locale", "en"),
            verdict=body.decision, notes=body.notes or "",
        )
    await log_action(admin, f"document_{body.decision}", "document", document_id, body.notes)
    return {"message": f"Document {body.decision}"}


# ---------------------------------------------------------------- Parcels

@router.get("/parcels")
async def all_parcels(
    admin: Annotated[dict, Depends(require_admin)],
    q: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    skip: int = Query(0, ge=0),
):
    db = get_db()
    query: dict = {}
    if q:
        query["parcel_reference"] = {"$regex": q, "$options": "i"}
    if status_filter:
        query["status"] = status_filter
    cursor = db.parcels.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for parcel in cursor:
        data = serialize(parcel)
        owner = await db.users.find_one({"_id": parcel["current_owner_id"]})
        data["owner"] = {"name": owner["name"], "email": owner["email"]} if owner else None
        items.append(data)
    return {"items": items, "total": await db.parcels.count_documents(query)}


@router.patch("/parcels/{parcel_id}")
async def update_parcel(
    parcel_id: str,
    body: ParcelAdminUpdateRequest,
    admin: Annotated[dict, Depends(require_admin)],
):
    db = get_db()
    parcel = await db.parcels.find_one({"_id": object_id(parcel_id)})
    if parcel is None:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if body.status is None:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.parcels.update_one({"_id": parcel["_id"]}, {"$set": {"status": body.status, "updated_at": utcnow()}})
    await log_action(admin, f"parcel_status_{body.status}", "parcel", parcel_id, body.notes)
    return {"message": f"Parcel marked {body.status}"}


# ---------------------------------------------------------------- Disputes

@router.get("/disputes")
async def all_disputes(
    admin: Annotated[dict, Depends(require_admin)],
    status_filter: str | None = Query(None, alias="status"),
):
    db = get_db()
    query = {"status": status_filter} if status_filter else {}
    cursor = db.disputes.find(query).sort("created_at", -1)
    items = []
    async for d in cursor:
        data = serialize(d)
        parcel = await db.parcels.find_one({"_id": d["parcel_id"]})
        raiser = await db.users.find_one({"_id": d["raised_by"]})
        data["parcel_reference"] = parcel["parcel_reference"] if parcel else None
        data["raised_by_user"] = {"name": raiser["name"], "email": raiser["email"]} if raiser else None
        items.append(data)
    return {"items": items}


@router.patch("/disputes/{dispute_id}")
async def update_dispute(
    dispute_id: str,
    body: DisputeUpdateRequest,
    background: BackgroundTasks,
    admin: Annotated[dict, Depends(require_admin)],
):
    db = get_db()
    dispute = await db.disputes.find_one({"_id": object_id(dispute_id)})
    if dispute is None:
        raise HTTPException(status_code=404, detail="Dispute not found")
    now = utcnow()
    updates: dict = {"status": body.status, "resolution_notes": body.resolution_notes}
    if body.status in ("resolved", "rejected"):
        updates["resolved_at"] = now
    await db.disputes.update_one({"_id": dispute["_id"]}, {"$set": updates})

    parcel = await db.parcels.find_one({"_id": dispute["parcel_id"]})
    if parcel and body.status in ("resolved", "rejected"):
        # Restore the parcel to active only if no other open disputes remain
        remaining = await db.disputes.count_documents(
            {"parcel_id": parcel["_id"], "status": {"$in": ["open", "under_review"]}}
        )
        if remaining == 0 and parcel["status"] == "disputed":
            await db.parcels.update_one({"_id": parcel["_id"]}, {"$set": {"status": "active", "updated_at": now}})

    raiser = await db.users.find_one({"_id": dispute["raised_by"]})
    if raiser and parcel:
        background.add_task(
            send_email, raiser["email"], "dispute_update", raiser.get("locale", "en"),
            parcel=parcel["parcel_reference"], status=body.status, notes=body.resolution_notes or "",
        )
    await log_action(admin, f"dispute_{body.status}", "dispute", dispute_id, body.resolution_notes)
    return {"message": f"Dispute {body.status}"}


# ---------------------------------------------------------------- Payments

@router.get("/payments")
async def all_payments(
    admin: Annotated[dict, Depends(require_admin)],
    status_filter: str | None = Query(None, alias="status"),
    type_filter: str | None = Query(None, alias="type"),
    limit: int = Query(100, le=500),
    skip: int = Query(0, ge=0),
):
    db = get_db()
    query: dict = {}
    if status_filter:
        query["status"] = status_filter
    if type_filter:
        query["type"] = type_filter
    cursor = db.payments.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for p in cursor:
        data = serialize(p, exclude={"fapshi_payload"})
        payer = await db.users.find_one({"_id": p["user_id"]})
        data["user"] = {"name": payer["name"], "email": payer["email"]} if payer else None
        items.append(data)

    revenue_pipeline = [
        {"$match": {"status": "SUCCESSFUL"}},
        {"$group": {"_id": "$type", "total": {"$sum": "$amount_xaf"}, "count": {"$sum": 1}}},
    ]
    revenue = {row["_id"]: {"total_xaf": row["total"], "count": row["count"]} async for row in db.payments.aggregate(revenue_pipeline)}
    return {"items": items, "total": await db.payments.count_documents(query), "revenue": revenue}


# ---------------------------------------------------------------- Theme

@router.get("/theme")
async def get_theme(admin: Annotated[dict, Depends(require_admin)]):
    db = get_db()
    theme = await db.theme_settings.find_one(sort=[("updated_at", -1)])
    if theme is None:
        return {"primary": "#111827", "secondary": "#B45309", "accent": "#F5E6C8", "background": "#FFFFFF", "text": "#374151"}
    return serialize(theme)


@router.put("/theme")
async def update_theme(body: ThemeSettings, admin: Annotated[dict, Depends(require_admin)]):
    db = get_db()
    doc = body.model_dump()
    doc.update({"updated_by": admin["_id"], "updated_at": utcnow()})
    await db.theme_settings.insert_one(doc)
    await log_action(admin, "update_theme", "theme_settings", "active", str(body.model_dump()))
    return {"message": "Theme updated", "theme": body.model_dump()}


# ---------------------------------------------------------------- Logs & waitlist

@router.get("/logs")
async def admin_logs(
    admin: Annotated[dict, Depends(require_admin)],
    limit: int = Query(100, le=500),
    skip: int = Query(0, ge=0),
):
    db = get_db()
    cursor = db.admin_logs.find({}).sort("created_at", -1).skip(skip).limit(limit)
    return {"items": [serialize(log) async for log in cursor], "total": await db.admin_logs.count_documents({})}


@router.get("/waitlist")
async def waitlist_entries(admin: Annotated[dict, Depends(require_admin)], limit: int = Query(200, le=1000)):
    db = get_db()
    cursor = db.waitlist_entries.find({}).sort("created_at", -1).limit(limit)
    return {"items": [serialize(e) async for e in cursor], "total": await db.waitlist_entries.count_documents({})}
