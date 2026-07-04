"""AI document verification pipeline (§16).

Two sub-systems feeding documents.ai_verification_result:
  A. Document authentication (metadata/template/signature checks)
  B. AI-generated / deepfake detection

When AI_MODEL_ENDPOINT is configured, requests are forwarded to the
inference service. Otherwise a deterministic heuristic stub is used so the
full human-in-the-loop review flow works in development.

Human-in-the-loop is non-negotiable: no verdict here auto-rejects anything.
'suspicious'/'fraudulent' verdicts only route documents to the admin queue.
"""

import hashlib
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

Verdict = str  # "authentic" | "suspicious" | "fraudulent"


async def verify_document(file_url: str, doc_type: str) -> dict:
    """Returns {score: float 0-1, verdict, flagged_reasons: [], model_version}."""
    if settings.AI_MODEL_ENDPOINT:
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    f"{settings.AI_MODEL_ENDPOINT}/verify-document",
                    json={"file_url": file_url, "doc_type": doc_type},
                )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("AI model endpoint failed, falling back to stub: %s", exc)

    return _stub_result(file_url, kind="document")


async def face_match(id_document_url: str, selfie_url: str) -> dict:
    """Returns {score: float 0-1, model_version} — assistive KYC triage only (§11.2)."""
    if settings.AI_MODEL_ENDPOINT:
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    f"{settings.AI_MODEL_ENDPOINT}/face-match",
                    json={"id_document_url": id_document_url, "selfie_url": selfie_url},
                )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            logger.error("AI face-match endpoint failed, falling back to stub: %s", exc)

    digest = hashlib.sha256(f"{id_document_url}|{selfie_url}".encode()).digest()
    score = 0.55 + (digest[0] / 255) * 0.45  # deterministic pseudo-score, 0.55–1.0
    return {"score": round(score, 3), "model_version": "stub-0.1"}


def _stub_result(file_url: str, kind: str) -> dict:
    """Deterministic pseudo-verdict derived from the URL hash.

    Roughly 80% authentic / 15% suspicious / 5% fraudulent so the admin
    review queue receives realistic traffic in development.
    """
    digest = hashlib.sha256(f"{kind}:{file_url}".encode()).digest()
    bucket = digest[0] % 100
    if bucket < 80:
        verdict, score, reasons = "authentic", 0.9 + (digest[1] / 255) * 0.1, []
    elif bucket < 95:
        verdict, score, reasons = (
            "suspicious",
            0.4 + (digest[1] / 255) * 0.3,
            ["Stamp geometry deviates from known regional templates", "EXIF metadata missing or stripped"],
        )
    else:
        verdict, score, reasons = (
            "fraudulent",
            0.05 + (digest[1] / 255) * 0.2,
            ["Diffusion-model noise fingerprint detected", "Signature stroke inconsistency across pages"],
        )
    return {
        "score": round(score, 3),
        "verdict": verdict,
        "flagged_reasons": reasons,
        "model_version": "stub-0.1",
    }
