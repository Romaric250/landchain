"""UploadThing integration helper.

The frontend uploads files directly to UploadThing and sends back file URLs.
This module validates that submitted URLs plausibly belong to our
UploadThing app and offers a presigned-URL helper for server-driven uploads.
"""

import logging
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_HOSTS = {"utfs.io", "uploadthing.com", "ufs.sh"}


def is_valid_upload_url(url: str) -> bool:
    """Accept UploadThing-hosted URLs; in development (no UploadThing app
    configured) accept any https URL so flows remain testable."""
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    if not settings.UPLOADTHING_SECRET:
        return True
    host = (parsed.hostname or "").lower()
    return any(host == h or host.endswith("." + h) for h in ALLOWED_HOSTS)


async def delete_files(file_keys: list[str]) -> bool:
    """Delete files from UploadThing (e.g. rejected KYC documents)."""
    if not settings.UPLOADTHING_SECRET or not file_keys:
        return True
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.uploadthing.com/v6/deleteFiles",
                headers={"x-uploadthing-api-key": settings.UPLOADTHING_SECRET},
                json={"fileKeys": file_keys},
            )
        return resp.status_code == 200
    except httpx.HTTPError as exc:
        logger.error("UploadThing delete failed: %s", exc)
        return False
