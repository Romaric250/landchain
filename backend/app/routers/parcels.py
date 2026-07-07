from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app.core.database import get_db
from app.core.deps import (
    get_current_user,
    get_optional_user,
    has_active_subscription,
    object_id,
    require_kyc_verified,
    require_subscription,
)
from app.core.rate_limit import rate_limit
from app.models.common import serialize, utcnow
from app.models.schemas import ParcelCreateRequest, ParcelTransferRequest
from app.services import blockchain
from app.services.resend_client import send_email

router = APIRouter(prefix="/parcels", tags=["parcels"])

# Fields visible to everyone (privacy, §17): no exact geometry, no owner identity
PUBLIC_FIELDS = {"parcel_reference", "region", "status", "registration_date", "listing", "area_sqm"}


# Fields visible on the public explore map (geometry included, no owner identity)
MAP_PUBLIC_FIELDS = {"parcel_reference", "region", "status", "registration_date", "listing", "area_sqm", "geojson"}


def _public_view(parcel: dict) -> dict:
    full = serialize(parcel)
    out = {k: v for k, v in full.items() if k in PUBLIC_FIELDS or k == "id"}
    listing = out.get("listing") or {}
    # Listed-for-sale parcels intentionally expose location for the marketplace map
    if listing.get("status") == "active" and listing.get("is_for_sale"):
        out["geojson"] = full.get("geojson")
    else:
        out["listing"] = {"is_for_sale": False, "status": listing.get("status", "none")}
    return out


def _map_public_view(parcel: dict) -> dict:
    """Public map view — shows parcel boundaries without owner details."""
    full = serialize(parcel)
    out = {k: v for k, v in full.items() if k in MAP_PUBLIC_FIELDS or k == "id"}
    listing = out.get("listing") or {}
    if listing.get("status") != "active" or not listing.get("is_for_sale"):
        out["listing"] = {
            "is_for_sale": bool(listing.get("is_for_sale")),
            "status": listing.get("status", "none"),
            "price_xaf": listing.get("price_xaf"),
        }
    return out


@router.get("/map")
async def map_parcels(
    region: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    q: str | None = Query(None, description="parcel reference search"),
    limit: int = Query(200, le=500),
):
    """Public explore map — returns parcel geometry and status for all registered parcels."""
    db = get_db()
    query: dict = {}
    if region:
        query["region"] = {"$regex": region, "$options": "i"}
    if status_filter in ("active", "disputed", "flagged"):
        query["status"] = status_filter
    if q:
        query["parcel_reference"] = {"$regex": q, "$options": "i"}

    cursor = db.parcels.find(query).sort("created_at", -1).limit(limit)
    items = [_map_public_view(p) async for p in cursor]
    total = await db.parcels.count_documents(query)
    return {"items": items, "total": total}


def _is_owner_or_admin(parcel: dict, user: dict | None) -> bool:
    if user is None:
        return False
    if user.get("role") in ("admin", "super_admin"):
        return True
    return parcel.get("current_owner_id") == user["_id"]


@router.get("")
async def list_parcels(
    user: Annotated[dict | None, Depends(get_optional_user)],
    region: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    for_sale: bool | None = None,
    bbox: str | None = Query(None, description="minLng,minLat,maxLng,maxLat"),
    q: str | None = Query(None, description="parcel reference search"),
    limit: int = Query(50, le=200),
    skip: int = Query(0, ge=0),
):
    db = get_db()
    query: dict = {}
    if region:
        query["region"] = {"$regex": region, "$options": "i"}
    if status_filter in ("active", "disputed", "flagged"):
        query["status"] = status_filter
    if for_sale:
        query["listing.is_for_sale"] = True
        query["listing.status"] = "active"
    if q:
        query["parcel_reference"] = {"$regex": q, "$options": "i"}
    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = (float(x) for x in bbox.split(","))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid bbox format")
        query["geojson"] = {
            "$geoIntersects": {
                "$geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [min_lng, min_lat], [max_lng, min_lat], [max_lng, max_lat],
                        [min_lng, max_lat], [min_lng, min_lat],
                    ]],
                }
            }
        }

    cursor = db.parcels.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for parcel in cursor:
        if _is_owner_or_admin(parcel, user):
            items.append(serialize(parcel))
        else:
            items.append(_public_view(parcel))
    total = await db.parcels.count_documents(query)
    return {"items": items, "total": total}


@router.get("/mine")
async def my_parcels(user: Annotated[dict, Depends(get_current_user)]):
    db = get_db()
    cursor = db.parcels.find({"current_owner_id": user["_id"]}).sort("created_at", -1)
    return {"items": [serialize(p) async for p in cursor]}


@router.get("/{parcel_id}")
async def get_parcel(parcel_id: str, user: Annotated[dict | None, Depends(get_optional_user)]):
    db = get_db()
    parcel = await db.parcels.find_one({"_id": object_id(parcel_id)})
    if parcel is None:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if _is_owner_or_admin(parcel, user):
        data = serialize(parcel)
        cursor = db.transactions.find({"parcel_id": parcel["_id"]}).sort("timestamp", 1)
        data["transactions"] = [serialize(t) async for t in cursor]
        doc_cursor = db.documents.find({"parcel_id": parcel["_id"]})
        data["document_list"] = [serialize(d) async for d in doc_cursor]
        return data
    return _public_view(parcel)


@router.post("", status_code=201)
async def register_parcel(
    body: ParcelCreateRequest,
    user: Annotated[dict, Depends(require_kyc_verified)],
):
    db = get_db()
    now = utcnow()

    # --- Duplicate-registration check (critical logic, §13.3) ---
    # 1. Exact parcel_reference match
    existing_ref = await db.parcels.find_one(
        {"parcel_reference": body.parcel_reference, "status": {"$ne": "disputed"}}
    )
    if existing_ref:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "A parcel with this reference is already registered on LandChain",
                "existing_parcel": _public_view(existing_ref),
                "reason": "duplicate_reference",
            },
        )
    # 2. Geolocation overlap against submitted geometry
    overlap = await db.parcels.find_one(
        {
            "geojson": {"$geoIntersects": {"$geometry": body.geojson.model_dump()}},
            "status": "active",
        }
    )
    if overlap:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "This location overlaps an already-registered active parcel",
                "existing_parcel": _public_view(overlap),
                "reason": "geolocation_overlap",
            },
        )

    doc_ids = [object_id(d) for d in body.document_ids]
    parcel_doc = {
        "parcel_reference": body.parcel_reference,
        "geojson": body.geojson.model_dump(),
        "region": body.region,
        "area_sqm": body.area_sqm,
        "current_owner_id": user["_id"],
        "blockchain_token_id": None,
        "blockchain_tx_hash": None,
        "record_hash": None,
        "status": "active",
        "listing": {"is_for_sale": False, "price_xaf": None, "listed_at": None, "expires_at": None, "payment_id": None, "status": "none"},
        "documents": doc_ids,
        "registration_date": now,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.parcels.insert_one(parcel_doc)
    parcel_id = result.inserted_id

    if doc_ids:
        await db.documents.update_many({"_id": {"$in": doc_ids}}, {"$set": {"parcel_id": parcel_id}})

    # On-chain anchor (§15) — only hash references, never personal data
    chain = await blockchain.mint_parcel(
        body.parcel_reference,
        {"parcel_reference": body.parcel_reference, "region": body.region, "area_sqm": body.area_sqm, "registered_at": now},
    )
    await db.parcels.update_one(
        {"_id": parcel_id},
        {"$set": {"blockchain_tx_hash": chain.get("tx_hash"), "record_hash": chain.get("record_hash")}},
    )

    await db.transactions.insert_one(
        {
            "parcel_id": parcel_id,
            "from_owner_id": None,
            "to_owner_id": user["_id"],
            "type": "registration",
            "blockchain_tx_hash": chain.get("tx_hash"),
            "notary_id": None,
            "status": "completed",
            "timestamp": now,
        }
    )

    parcel = await db.parcels.find_one({"_id": parcel_id})
    return serialize(parcel)


@router.post("/{parcel_id}/verify", dependencies=[Depends(rate_limit(30, 60, "verify_full"))])
async def full_verification(
    parcel_id: str,
    user: Annotated[dict, Depends(require_subscription)],
):
    """Full paid verification report: history, documents, chain-of-custody (§13.3)."""
    db = get_db()
    parcel = await db.parcels.find_one({"_id": object_id(parcel_id)})
    if parcel is None:
        raise HTTPException(status_code=404, detail="Parcel not found")

    owner = await db.users.find_one({"_id": parcel["current_owner_id"]})
    tx_cursor = db.transactions.find({"parcel_id": parcel["_id"]}).sort("timestamp", 1)
    transactions = [serialize(t) async for t in tx_cursor]
    doc_cursor = db.documents.find({"parcel_id": parcel["_id"]})
    documents = [
        {
            "id": str(d["_id"]),
            "doc_type": d.get("doc_type"),
            "ai_verification_result": d.get("ai_verification_result"),
            "human_review_status": d.get("human_review_status"),
            "created_at": d.get("created_at").isoformat() if d.get("created_at") else None,
        }
        async for d in doc_cursor
    ]
    disputes_count = await db.disputes.count_documents({"parcel_id": parcel["_id"], "status": {"$in": ["open", "under_review"]}})

    return {
        "parcel": serialize(parcel),
        "current_owner": {"name": owner["name"] if owner else "Unknown", "kyc_verified": bool(owner and owner.get("kyc_status") == "verified")},
        "transactions": transactions,
        "documents": documents,
        "open_disputes": disputes_count,
        "blockchain": {
            "anchored": bool(parcel.get("blockchain_tx_hash")),
            "tx_hash": parcel.get("blockchain_tx_hash"),
            "record_hash": parcel.get("record_hash"),
        },
        "verdict": (
            "disputed" if parcel["status"] == "disputed"
            else "flagged" if parcel["status"] == "flagged"
            else "verified"
        ),
        "generated_at": utcnow().isoformat(),
    }


@router.post("/{parcel_id}/transfer")
async def transfer_parcel(
    parcel_id: str,
    body: ParcelTransferRequest,
    background: BackgroundTasks,
    user: Annotated[dict, Depends(require_kyc_verified)],
):
    db = get_db()
    parcel = await db.parcels.find_one({"_id": object_id(parcel_id)})
    if parcel is None:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel["current_owner_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Only the current owner can initiate a transfer")
    if parcel["status"] != "active":
        raise HTTPException(status_code=409, detail=f"Parcel is {parcel['status']} and cannot be transferred")

    recipient = await db.users.find_one({"email": body.to_owner_email.lower()})
    if recipient is None:
        raise HTTPException(status_code=404, detail="Recipient not found — they must have a LandChain account")
    if recipient.get("kyc_status") != "verified":
        raise HTTPException(status_code=409, detail="Recipient must complete KYC verification before receiving a transfer")
    if recipient["_id"] == user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot transfer a parcel to yourself")

    notary_id = None
    if body.notary_email:
        notary = await db.users.find_one({"email": body.notary_email.lower(), "role": "notary"})
        if notary is None:
            raise HTTPException(status_code=404, detail="Notary not found")
        notary_id = notary["_id"]

    now = utcnow()
    chain = await blockchain.record_transfer(
        parcel.get("blockchain_token_id"),
        {"parcel_reference": parcel["parcel_reference"], "transferred_at": now, "type": "transfer"},
    )
    tx = {
        "parcel_id": parcel["_id"],
        "from_owner_id": user["_id"],
        "to_owner_id": recipient["_id"],
        "type": "transfer",
        "blockchain_tx_hash": chain.get("tx_hash"),
        "notary_id": notary_id,
        # With a notary the transfer stays pending until co-signed; otherwise completes directly
        "status": "pending" if notary_id else "completed",
        "timestamp": now,
    }
    result = await db.transactions.insert_one(tx)

    if tx["status"] == "completed":
        await db.parcels.update_one(
            {"_id": parcel["_id"]},
            {"$set": {
                "current_owner_id": recipient["_id"],
                "record_hash": chain.get("record_hash"),
                "listing": {"is_for_sale": False, "price_xaf": None, "listed_at": None, "expires_at": None, "payment_id": None, "status": "none"},
                "updated_at": now,
            }},
        )

    for party, status_word in ((user, "initiated"), (recipient, tx["status"])):
        background.add_task(
            send_email, party["email"], "transfer_update", party.get("locale", "en"),
            parcel=parcel["parcel_reference"], status=status_word,
        )
    return {"message": f"Transfer {tx['status']}", "transaction_id": str(result.inserted_id), "status": tx["status"]}


@router.post("/{parcel_id}/cosign")
async def cosign_transfer(
    parcel_id: str,
    background: BackgroundTasks,
    user: Annotated[dict, Depends(get_current_user)],
):
    """Notary co-signs the pending transfer on a parcel."""
    if user.get("role") != "notary":
        raise HTTPException(status_code=403, detail="Only notaries can co-sign transfers")
    db = get_db()
    tx = await db.transactions.find_one(
        {"parcel_id": object_id(parcel_id), "status": "pending", "type": "transfer", "notary_id": user["_id"]},
        sort=[("timestamp", -1)],
    )
    if tx is None:
        raise HTTPException(status_code=404, detail="No pending transfer assigned to you on this parcel")
    now = utcnow()
    await db.transactions.update_one({"_id": tx["_id"]}, {"$set": {"status": "completed"}})
    await db.parcels.update_one(
        {"_id": tx["parcel_id"]},
        {"$set": {
            "current_owner_id": tx["to_owner_id"],
            "listing": {"is_for_sale": False, "price_xaf": None, "listed_at": None, "expires_at": None, "payment_id": None, "status": "none"},
            "updated_at": now,
        }},
    )
    parcel = await db.parcels.find_one({"_id": tx["parcel_id"]})
    for uid in (tx["from_owner_id"], tx["to_owner_id"]):
        party = await db.users.find_one({"_id": uid})
        if party:
            background.add_task(
                send_email, party["email"], "transfer_update", party.get("locale", "en"),
                parcel=parcel["parcel_reference"], status="completed (co-signed)",
            )
    return {"message": "Transfer co-signed and completed"}
