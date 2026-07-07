"""Seed demo parcels for map/marketplace demos. Idempotent — skips if demo refs exist."""

import logging
import random

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password
from app.models.common import utcnow

logger = logging.getLogger(__name__)

DEMO_MARKER = "LC-DEMO-"
DEMO_OWNER_EMAIL = "demo.owner@landchain.app"

# Around Douala & Yaoundé — [lng, lat] centers with small polygon offsets (meters-ish)
DEMO_PARCELS = [
    {"ref": "LC-DEMO-001", "region": "Littoral", "area": 1200, "status": "active", "sale": True, "price": 45_000_000, "center": [9.768, 4.051]},
    {"ref": "LC-DEMO-002", "region": "Littoral", "area": 850, "status": "active", "sale": True, "price": 28_000_000, "center": [9.782, 4.062]},
    {"ref": "LC-DEMO-003", "region": "Littoral", "area": 2100, "status": "active", "sale": False, "price": None, "center": [9.755, 4.038]},
    {"ref": "LC-DEMO-004", "region": "Littoral", "area": 640, "status": "disputed", "sale": False, "price": None, "center": [9.791, 4.045]},
    {"ref": "LC-DEMO-005", "region": "Littoral", "area": 1500, "status": "flagged", "sale": False, "price": None, "center": [9.740, 4.058]},
    {"ref": "LC-DEMO-006", "region": "Littoral", "area": 980, "status": "active", "sale": True, "price": 18_500_000, "center": [9.801, 4.072]},
    {"ref": "LC-DEMO-007", "region": "Littoral", "area": 3200, "status": "active", "sale": True, "price": 72_000_000, "center": [9.725, 4.025]},
    {"ref": "LC-DEMO-008", "region": "Littoral", "area": 1100, "status": "disputed", "sale": True, "price": 22_000_000, "center": [9.815, 4.035]},
    {"ref": "LC-DEMO-009", "region": "Littoral", "area": 760, "status": "active", "sale": False, "price": None, "center": [9.748, 4.068]},
    {"ref": "LC-DEMO-010", "region": "Littoral", "area": 1900, "status": "active", "sale": True, "price": 35_000_000, "center": [9.776, 4.018]},
    {"ref": "LC-DEMO-011", "region": "Centre", "area": 1400, "status": "active", "sale": True, "price": 40_000_000, "center": [11.502, 3.848]},
    {"ref": "LC-DEMO-012", "region": "Centre", "area": 920, "status": "active", "sale": False, "price": None, "center": [11.518, 3.862]},
    {"ref": "LC-DEMO-013", "region": "Centre", "area": 2500, "status": "disputed", "sale": False, "price": None, "center": [11.490, 3.835]},
    {"ref": "LC-DEMO-014", "region": "Centre", "area": 680, "status": "active", "sale": True, "price": 15_000_000, "center": [11.525, 3.840]},
    {"ref": "LC-DEMO-015", "region": "Centre", "area": 1750, "status": "flagged", "sale": False, "price": None, "center": [11.508, 3.855]},
    {"ref": "LC-DEMO-016", "region": "Centre", "area": 1300, "status": "active", "sale": True, "price": 32_000_000, "center": [11.495, 3.870]},
    {"ref": "LC-DEMO-017", "region": "Littoral", "area": 2200, "status": "active", "sale": False, "price": None, "center": [9.760, 4.085]},
    {"ref": "LC-DEMO-018", "region": "Littoral", "area": 540, "status": "active", "sale": True, "price": 12_000_000, "center": [9.830, 4.055]},
    {"ref": "LC-DEMO-019", "region": "Centre", "area": 3100, "status": "active", "sale": True, "price": 55_000_000, "center": [11.512, 3.828]},
    {"ref": "LC-DEMO-020", "region": "Littoral", "area": 890, "status": "disputed", "sale": False, "price": None, "center": [9.705, 4.042]},
]


def _polygon_around(lng: float, lat: float, size: float = 0.0018) -> dict:
    """Small axis-aligned rectangle as GeoJSON Polygon."""
    return {
        "type": "Polygon",
        "coordinates": [[
            [lng - size, lat - size * 0.7],
            [lng + size, lat - size * 0.7],
            [lng + size * 1.1, lat + size * 0.8],
            [lng - size * 0.9, lat + size * 0.9],
            [lng - size, lat - size * 0.7],
        ]],
    }


async def _ensure_demo_owner(db):
    owner = await db.users.find_one({"email": DEMO_OWNER_EMAIL})
    if owner:
        return owner["_id"]
    now = utcnow()
    result = await db.users.insert_one(
        {
            "name": "LandChain Demo Owner",
            "email": DEMO_OWNER_EMAIL,
            "phone": "+237600000000",
            "password_hash": hash_password("DemoOwner123!"),
            "role": "citizen",
            "locale": "fr",
            "status": "active",
            "kyc_status": "verified",
            "subscription": {"plan": None, "status": "none", "started_at": None, "expires_at": None, "last_payment_id": None},
            "created_at": now,
            "updated_at": now,
        }
    )
    return result.inserted_id


async def seed_demo_parcels() -> None:
    if not settings.SEED_DEMO_DATA:
        return
    db = get_db()
    existing = await db.parcels.find_one({"parcel_reference": {"$regex": f"^{DEMO_MARKER}"}})
    if existing:
        logger.info("Demo parcels already seeded — skipping")
        return

    owner_id = await _ensure_demo_owner(db)
    now = utcnow()
    inserted = 0

    for spec in DEMO_PARCELS:
        lng, lat = spec["center"]
        jitter_lng = lng + random.uniform(-0.002, 0.002)
        jitter_lat = lat + random.uniform(-0.002, 0.002)
        listing_active = spec["sale"] and spec["status"] == "active"
        listing = {
            "is_for_sale": listing_active,
            "price_xaf": spec["price"] if listing_active else None,
            "listed_at": now if listing_active else None,
            "expires_at": None,
            "payment_id": None,
            "status": "active" if listing_active else "none",
        }
        await db.parcels.insert_one(
            {
                "parcel_reference": spec["ref"],
                "geojson": _polygon_around(jitter_lng, jitter_lat),
                "region": spec["region"],
                "area_sqm": spec["area"],
                "current_owner_id": owner_id,
                "blockchain_tx_hash": None,
                "record_hash": f"demo-{spec['ref'].lower()}",
                "blockchain_token_id": None,
                "status": spec["status"],
                "listing": listing,
                "documents": [],
                "registration_date": now,
                "created_at": now,
                "updated_at": now,
            }
        )
        inserted += 1

    logger.info("Seeded %d demo parcels for public map", inserted)
