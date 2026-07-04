from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.common import serialize, utcnow
from app.models.schemas import KycSubmitRequest
from app.services import ai_verification
from app.services.uploadthing_client import is_valid_upload_url

router = APIRouter(prefix="/kyc", tags=["kyc"])


async def _run_ai_precheck(submission_id, id_url: str, selfie_url: str) -> None:
    """Assistive AI triage only — final decision is always human (§11.2)."""
    db = get_db()
    face = await ai_verification.face_match(id_url, selfie_url)
    doc_check = await ai_verification.verify_document(id_url, "national_id")
    await db.kyc_submissions.update_one(
        {"_id": submission_id},
        {"$set": {"ai_face_match_score": face.get("score"), "ai_document_check": doc_check}},
    )


@router.post("/submit", status_code=201)
async def submit_kyc(
    body: KycSubmitRequest,
    background: BackgroundTasks,
    user: Annotated[dict, Depends(get_current_user)],
):
    if user["kyc_status"] in ("pending", "verified"):
        raise HTTPException(status_code=409, detail=f"KYC already {user['kyc_status']}")
    for url in (body.id_document_url, body.selfie_url, body.id_document_back_url):
        if url and not is_valid_upload_url(url):
            raise HTTPException(status_code=400, detail="Invalid document URL — files must be uploaded through LandChain")

    db = get_db()
    now = utcnow()
    doc = {
        "user_id": user["_id"],
        "id_document_url": body.id_document_url,
        "id_document_back_url": body.id_document_back_url,
        "selfie_url": body.selfie_url,
        "ai_face_match_score": None,
        "ai_document_check": None,
        "status": "pending",
        "reviewed_by": None,
        "review_notes": None,
        "created_at": now,
        "reviewed_at": None,
    }
    result = await db.kyc_submissions.insert_one(doc)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"kyc_status": "pending", "updated_at": now}})
    background.add_task(_run_ai_precheck, result.inserted_id, body.id_document_url, body.selfie_url)
    return {"message": "KYC submitted — pending review", "submission_id": str(result.inserted_id)}


@router.get("/status")
async def kyc_status(user: Annotated[dict, Depends(get_current_user)]):
    db = get_db()
    latest = await db.kyc_submissions.find_one({"user_id": user["_id"]}, sort=[("created_at", -1)])
    return {
        "kyc_status": user["kyc_status"],
        "latest_submission": serialize(latest, exclude={"reviewed_by"}) if latest else None,
    }
