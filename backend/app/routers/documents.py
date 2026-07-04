from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.core.database import get_db
from app.core.deps import get_current_user, object_id
from app.models.common import serialize, utcnow
from app.models.schemas import DocumentUploadRequest
from app.services import ai_verification
from app.services.uploadthing_client import is_valid_upload_url

router = APIRouter(prefix="/documents", tags=["documents"])


async def run_ai_verification(document_id) -> None:
    db = get_db()
    doc = await db.documents.find_one({"_id": document_id})
    if doc is None:
        return
    result = await ai_verification.verify_document(doc["file_url"], doc["doc_type"])
    # Human-in-the-loop (§16): suspicious/fraudulent → admin review queue, never auto-reject
    needs_review = result.get("verdict") in ("suspicious", "fraudulent")
    await db.documents.update_one(
        {"_id": document_id},
        {"$set": {
            "ai_verification_result": result,
            "human_review_status": "pending" if needs_review else "not_required",
        }},
    )


@router.post("/upload", status_code=201)
async def upload_document(
    body: DocumentUploadRequest,
    background: BackgroundTasks,
    user: Annotated[dict, Depends(get_current_user)],
):
    if not is_valid_upload_url(body.file_url):
        raise HTTPException(status_code=400, detail="Invalid file URL — files must be uploaded through LandChain")

    db = get_db()
    parcel_oid = None
    if body.parcel_id and body.parcel_id != "pending":
        parcel_oid = object_id(body.parcel_id)
        parcel = await db.parcels.find_one({"_id": parcel_oid})
        if parcel is None:
            raise HTTPException(status_code=404, detail="Parcel not found")
        if parcel["current_owner_id"] != user["_id"] and user.get("role") not in ("admin", "super_admin"):
            raise HTTPException(status_code=403, detail="You can only attach documents to your own parcels")

    now = utcnow()
    doc = {
        "parcel_id": parcel_oid,
        "uploaded_by": user["_id"],
        "file_url": body.file_url,
        "doc_type": body.doc_type,
        "ai_verification_result": None,
        "human_review_status": "not_required",
        "reviewed_by": None,
        "created_at": now,
    }
    result = await db.documents.insert_one(doc)
    if parcel_oid is not None:
        await db.parcels.update_one({"_id": parcel_oid}, {"$push": {"documents": result.inserted_id}})
    background.add_task(run_ai_verification, result.inserted_id)
    return {"id": str(result.inserted_id), "message": "Document uploaded — AI verification running"}


@router.post("/{document_id}/verify")
async def trigger_verification(
    document_id: str,
    background: BackgroundTasks,
    user: Annotated[dict, Depends(get_current_user)],
):
    db = get_db()
    doc = await db.documents.find_one({"_id": object_id(document_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc["uploaded_by"] != user["_id"] and user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not your document")
    background.add_task(run_ai_verification, doc["_id"])
    return {"message": "Verification queued"}


@router.get("/{document_id}")
async def get_document(document_id: str, user: Annotated[dict, Depends(get_current_user)]):
    db = get_db()
    doc = await db.documents.find_one({"_id": object_id(document_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc["uploaded_by"] != user["_id"] and user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not your document")
    return serialize(doc)
