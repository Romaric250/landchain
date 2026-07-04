"""Fapshi payment gateway client (§14).

Supports hosted checkout (initiate-pay) and payment-status polling.
When credentials are not configured (local development), runs in mock mode:
returns a fake checkout link pointing at the backend's mock-checkout page,
which lets developers simulate SUCCESSFUL / FAILED webhooks end-to-end.
"""

import logging
import re
import secrets

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

ID_PATTERN = re.compile(r"^[a-zA-Z0-9\-_]{1,100}$")


class FapshiError(Exception):
    pass


def is_mock_mode() -> bool:
    return not (settings.FAPSHI_API_USER and settings.FAPSHI_API_KEY)


def _headers() -> dict[str, str]:
    return {"apiuser": settings.FAPSHI_API_USER, "apikey": settings.FAPSHI_API_KEY}


def _sanitize_id(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\-_]", "", value)[:100]
    if not ID_PATTERN.match(cleaned):
        raise FapshiError(f"Invalid Fapshi id value: {value!r}")
    return cleaned


async def initiate_pay(
    *,
    amount: int,
    email: str,
    user_id: str,
    external_id: str,
    message: str,
    redirect_url: str,
) -> dict:
    """Create a hosted-checkout payment. Returns {link, transId, dateInitiated}."""
    if amount < 100:
        raise FapshiError("Fapshi minimum amount is 100 XAF")

    if is_mock_mode():
        trans_id = f"MOCK{secrets.token_hex(6).upper()}"
        logger.warning("Fapshi mock mode: generated transId=%s for %s XAF", trans_id, amount)
        return {
            "link": f"{settings.FRONTEND_URL}/mock-checkout?transId={trans_id}&amount={amount}",
            "transId": trans_id,
            "dateInitiated": None,
            "mock": True,
        }

    payload = {
        "amount": amount,
        "email": email,
        "redirectUrl": redirect_url,
        "userId": _sanitize_id(user_id),
        "externalId": _sanitize_id(external_id),
        "message": message[:200],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{settings.FAPSHI_BASE_URL}/initiate-pay", json=payload, headers=_headers())
    if resp.status_code != 200:
        logger.error("Fapshi initiate-pay error %s: %s", resp.status_code, resp.text)
        raise FapshiError(f"Fapshi initiate-pay failed ({resp.status_code})")
    return resp.json()


async def payment_status(trans_id: str) -> dict:
    """Poll Fapshi payment status. Rate-limited by Fapshi to 6 req/min/transId (§14.5)."""
    if is_mock_mode():
        return {"transId": trans_id, "status": "PENDING", "mock": True}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{settings.FAPSHI_BASE_URL}/payment-status/{trans_id}", headers=_headers())
    if resp.status_code == 429:
        raise FapshiError("Fapshi rate limit reached for this transaction — try again in a minute")
    if resp.status_code != 200:
        logger.error("Fapshi payment-status error %s: %s", resp.status_code, resp.text)
        raise FapshiError(f"Fapshi payment-status failed ({resp.status_code})")
    return resp.json()


def verify_webhook_secret(header_value: str | None) -> bool:
    """Verify the x-wh-secret header (§14.4). In mock mode, accept 'mock-secret'."""
    if is_mock_mode():
        return header_value == (settings.FAPSHI_WEBHOOK_SECRET or "mock-secret")
    if not settings.FAPSHI_WEBHOOK_SECRET:
        logger.error("FAPSHI_WEBHOOK_SECRET not configured — rejecting webhook")
        return False
    return secrets.compare_digest(header_value or "", settings.FAPSHI_WEBHOOK_SECRET)
