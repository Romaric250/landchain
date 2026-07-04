from fastapi import APIRouter, BackgroundTasks, Depends

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models.common import utcnow
from app.models.schemas import ContactRequest, WaitlistRequest
from app.services.resend_client import send_email

router = APIRouter(tags=["public"])


@router.post("/waitlist", status_code=201, dependencies=[Depends(rate_limit(5, 3600, "waitlist"))])
async def join_waitlist(body: WaitlistRequest, background: BackgroundTasks):
    db = get_db()
    existing = await db.waitlist_entries.find_one({"email": body.email.lower()})
    if existing:
        return {"message": "You're already on the waitlist!"}
    await db.waitlist_entries.insert_one(
        {"email": body.email.lower(), "name": body.name, "locale": body.locale, "created_at": utcnow()}
    )
    background.add_task(send_email, body.email.lower(), "waitlist_confirmation", body.locale)
    return {"message": "You're on the waitlist — we'll be in touch!"}


@router.post("/contact", status_code=201, dependencies=[Depends(rate_limit(5, 3600, "contact"))])
async def contact(body: ContactRequest, background: BackgroundTasks):
    db = get_db()
    await db.contact_messages.insert_one(
        {"name": body.name, "email": body.email.lower(), "message": body.message, "created_at": utcnow(), "handled": False}
    )
    background.add_task(send_email, body.email.lower(), "contact_received", "en")
    return {"message": "Message received — we'll get back to you soon."}


@router.get("/verify/quick", dependencies=[Depends(rate_limit(10, 3600, "quick_verify"))])
async def quick_verify(ref: str):
    """Free-tier public lookup (§6.1): parcel status only — no history, no
    geometry, no owner detail. Full verification requires a subscription."""
    db = get_db()
    parcel = await db.parcels.find_one({"parcel_reference": ref.strip()})
    if parcel is None:
        return {"found": False, "status": "not_found", "parcel_reference": ref.strip()}
    return {
        "found": True,
        "parcel_reference": parcel["parcel_reference"],
        "status": parcel["status"],  # "active" (registered) | "disputed" | "flagged"
        "region": parcel["region"],
        "registered": True,
        "registration_year": parcel["registration_date"].year if parcel.get("registration_date") else None,
        "upgrade_hint": "Full ownership history and document authenticity require a subscription.",
    }


@router.get("/theme")
async def public_theme():
    """Active theme palette, consumed by the frontend ThemeProvider (§9.2)."""
    db = get_db()
    theme = await db.theme_settings.find_one(sort=[("updated_at", -1)])
    if theme is None:
        return {
            "primary": "#111827",
            "secondary": "#B45309",
            "accent": "#F5E6C8",
            "background": "#FFFFFF",
            "text": "#374151",
        }
    return {k: theme[k] for k in ("primary", "secondary", "accent", "background", "text")}


@router.get("/config")
async def public_config():
    return {
        "mapbox_token_configured": bool(settings.MAPBOX_ACCESS_TOKEN),
        "environment": settings.ENV,
    }
