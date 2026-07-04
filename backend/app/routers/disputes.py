from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_db
from app.core.deps import get_current_user, object_id
from app.models.common import serialize, utcnow
from app.models.schemas import DisputeCreateRequest

router = APIRouter(prefix="/disputes", tags=["disputes"])


@router.post("", status_code=201)
async def raise_dispute(body: DisputeCreateRequest, user: Annotated[dict, Depends(get_current_user)]):
    db = get_db()
    parcel = await db.parcels.find_one({"_id": object_id(body.parcel_id)})
    if parcel is None:
        raise HTTPException(status_code=404, detail="Parcel not found")

    existing = await db.disputes.find_one(
        {"parcel_id": parcel["_id"], "raised_by": user["_id"], "status": {"$in": ["open", "under_review"]}}
    )
    if existing:
        raise HTTPException(status_code=409, detail="You already have an open dispute on this parcel")

    now = utcnow()
    result = await db.disputes.insert_one(
        {
            "parcel_id": parcel["_id"],
            "raised_by": user["_id"],
            "description": body.description,
            "status": "open",
            "resolution_notes": None,
            "created_at": now,
            "resolved_at": None,
        }
    )
    await db.parcels.update_one({"_id": parcel["_id"]}, {"$set": {"status": "disputed", "updated_at": now}})
    return {"id": str(result.inserted_id), "message": "Dispute raised — the parcel is now marked as disputed"}


@router.get("/mine")
async def my_disputes(user: Annotated[dict, Depends(get_current_user)]):
    db = get_db()
    cursor = db.disputes.find({"raised_by": user["_id"]}).sort("created_at", -1)
    items = []
    async for d in cursor:
        data = serialize(d)
        parcel = await db.parcels.find_one({"_id": d["parcel_id"]})
        data["parcel_reference"] = parcel["parcel_reference"] if parcel else None
        items.append(data)
    return {"items": items}


@router.get("/{parcel_id}")
async def parcel_disputes(parcel_id: str, user: Annotated[dict, Depends(get_current_user)]):
    db = get_db()
    cursor = db.disputes.find({"parcel_id": object_id(parcel_id)}).sort("created_at", -1)
    is_admin = user.get("role") in ("admin", "super_admin")
    items = []
    async for d in cursor:
        if is_admin or d["raised_by"] == user["_id"]:
            items.append(serialize(d))
        else:
            items.append({"id": str(d["_id"]), "status": d["status"], "created_at": d["created_at"].isoformat()})
    return {"items": items}
