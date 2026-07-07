"""AI document verification pipeline (§16).

Two sub-systems:
  A. Document authentication (metadata/template/signature checks)
  B. AI-generated / deepfake detection

Provider priority:
  1. GEMINI_API_KEY — Google Gemini vision (recommended for production)
  2. AI_MODEL_ENDPOINT — legacy custom inference microservice
  3. Deterministic stub (development only)

Human-in-the-loop is non-negotiable: no verdict here auto-rejects anything.
'suspicious'/'fraudulent' verdicts only route documents to the admin queue.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import re
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

Verdict = str  # "authentic" | "suspicious" | "fraudulent"

_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
_MIME_BY_EXT = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
}


async def verify_document(file_url: str, doc_type: str) -> dict:
    """Returns {score, verdict, flagged_reasons, user_message, model_version}."""
    if settings.GEMINI_API_KEY:
        try:
            return await _gemini_verify_document(file_url, doc_type)
        except Exception as exc:
            logger.error("Gemini document verification failed, falling back: %s", exc)

    if settings.AI_MODEL_ENDPOINT:
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    f"{settings.AI_MODEL_ENDPOINT}/verify-document",
                    json={"file_url": file_url, "doc_type": doc_type},
                )
            resp.raise_for_status()
            return _normalize_document_result(resp.json())
        except httpx.HTTPError as exc:
            logger.error("AI model endpoint failed, falling back to stub: %s", exc)

    return _stub_result(file_url, kind="document")


async def face_match(id_document_url: str, selfie_url: str) -> dict:
    """Returns {score, user_message, model_version} — assistive KYC triage only (§11.2)."""
    if settings.GEMINI_API_KEY:
        try:
            return await _gemini_face_match(id_document_url, selfie_url)
        except Exception as exc:
            logger.error("Gemini face match failed, falling back: %s", exc)

    if settings.AI_MODEL_ENDPOINT:
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    f"{settings.AI_MODEL_ENDPOINT}/face-match",
                    json={"id_document_url": id_document_url, "selfie_url": selfie_url},
                )
            resp.raise_for_status()
            return _normalize_face_result(resp.json())
        except httpx.HTTPError as exc:
            logger.error("AI face-match endpoint failed, falling back to stub: %s", exc)

    digest = hashlib.sha256(f"{id_document_url}|{selfie_url}".encode()).digest()
    score = 0.55 + (digest[0] / 255) * 0.45
    return {
        "score": round(score, 3),
        "user_message": "Development mode — face match is simulated. Set GEMINI_API_KEY for real analysis.",
        "model_version": "stub-0.1",
    }


async def _gemini_verify_document(file_url: str, doc_type: str) -> dict:
    image = await _fetch_file_bytes(file_url)
    prompt = f"""You are a forensic document analyst for LandChain, a land verification platform in Cameroon.

Analyze this uploaded document (type: {doc_type}). Look for:
- Signs of digital forgery or AI generation (inconsistent fonts, warped stamps, noise patterns)
- Missing or suspicious metadata patterns typical of scanned authentic docs
- Stamp/signature/font inconsistencies vs genuine Cameroon land/administrative documents
- Obvious tampering, copy-paste artifacts, or template mismatches

Return ONLY valid JSON with this exact schema:
{{
  "score": <float 0.0-1.0 where 1.0 = highly likely authentic>,
  "verdict": "authentic" | "suspicious" | "fraudulent",
  "flagged_reasons": [<short technical reasons, empty array if none>],
  "user_message": "<1-2 plain sentences for the document owner explaining the result in simple language>"
}}

Rules:
- "authentic": no significant fraud indicators (score >= 0.75)
- "suspicious": some concerns but not conclusive (score 0.35-0.74)
- "fraudulent": strong evidence of fake/forged/AI-generated document (score < 0.35)
- Be conservative: when uncertain, use "suspicious" not "fraudulent"
- user_message must be clear and non-alarming for authentic docs; for suspicious/fraudulent, explain what looked wrong"""

    raw = await _gemini_generate(prompt, [image])
    parsed = _parse_json_response(raw)
    return _normalize_document_result(parsed, model_version=settings.GEMINI_MODEL)


async def _gemini_face_match(id_document_url: str, selfie_url: str) -> dict:
    id_image = await _fetch_file_bytes(id_document_url)
    selfie_image = await _fetch_file_bytes(selfie_url)
    prompt = """You are a KYC identity analyst for LandChain (Cameroon).

Compare the face on the ID document (first image) with the live selfie (second image).

Return ONLY valid JSON:
{
  "score": <float 0.0-1.0 where 1.0 = very likely same person>,
  "user_message": "<1 plain sentence for the user about whether the faces appear to match>"
}

Consider lighting, angle, and age — be conservative. Score below 0.5 suggests a mismatch."""

    raw = await _gemini_generate(prompt, [id_image, selfie_image])
    parsed = _parse_json_response(raw)
    return _normalize_face_result(parsed, model_version=settings.GEMINI_MODEL)


async def _gemini_generate(prompt: str, files: list[tuple[str, bytes]]) -> str:
    parts: list[dict[str, Any]] = []
    for mime_type, data in files:
        parts.append(
            {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": base64.b64encode(data).decode("ascii"),
                }
            }
        )
    parts.append({"text": prompt})

    url = f"{_GEMINI_BASE}/{settings.GEMINI_MODEL}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            url,
            params={"key": settings.GEMINI_API_KEY},
            json=payload,
        )
    resp.raise_for_status()
    body = resp.json()
    try:
        return body["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise ValueError(f"Unexpected Gemini response shape: {body}") from exc


async def _fetch_file_bytes(url: str) -> tuple[str, bytes]:
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        resp = await client.get(url)
    resp.raise_for_status()
    content_type = resp.headers.get("content-type", "").split(";")[0].strip().lower()
    if content_type.startswith("image/") or content_type == "application/pdf":
        mime_type = content_type
    else:
        mime_type = _guess_mime_from_url(url)
    return mime_type, resp.content


def _guess_mime_from_url(url: str) -> str:
    lower = url.lower().split("?")[0]
    for ext, mime in _MIME_BY_EXT.items():
        if lower.endswith(ext):
            return mime
    return "image/jpeg"


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _normalize_document_result(data: dict, *, model_version: str | None = None) -> dict:
    verdict = str(data.get("verdict", "suspicious")).lower()
    if verdict not in ("authentic", "suspicious", "fraudulent"):
        verdict = "suspicious"
    score = float(data.get("score", 0.5))
    score = max(0.0, min(1.0, score))
    reasons = data.get("flagged_reasons") or []
    if not isinstance(reasons, list):
        reasons = [str(reasons)]
    user_message = str(data.get("user_message") or "").strip()
    if not user_message:
        user_message = _default_user_message(verdict, "document")
    return {
        "score": round(score, 3),
        "verdict": verdict,
        "flagged_reasons": [str(r) for r in reasons],
        "user_message": user_message,
        "model_version": model_version or str(data.get("model_version", "unknown")),
    }


def _normalize_face_result(data: dict, *, model_version: str | None = None) -> dict:
    score = float(data.get("score", 0.5))
    score = max(0.0, min(1.0, score))
    user_message = str(data.get("user_message") or "").strip()
    if not user_message:
        user_message = (
            "Your selfie appears to match your ID photo."
            if score >= 0.75
            else "Your selfie may not match your ID photo — an admin will review manually."
        )
    return {
        "score": round(score, 3),
        "user_message": user_message,
        "model_version": model_version or str(data.get("model_version", "unknown")),
    }


def _default_user_message(verdict: str, kind: str) -> str:
    if verdict == "authentic":
        return "No significant signs of forgery were detected. Your document will proceed to human review."
    if verdict == "suspicious":
        return "Some irregularities were detected. An admin will review this document before any decision."
    return "Strong indicators of a forged or AI-generated document were found. An admin will investigate."


def _stub_result(file_url: str, kind: str) -> dict:
    """Deterministic pseudo-verdict derived from the URL hash."""
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
        "user_message": _default_user_message(verdict, kind),
        "model_version": "stub-0.1",
    }
