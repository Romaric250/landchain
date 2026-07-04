"""Scheduled jobs (§6.1, §20.1):

- Expire subscriptions whose expires_at has passed (downgrade to free tier).
- Expire marketplace listings whose expires_at has passed.
- Send renewal-reminder emails at 7 days and 1 day before expiry (Resend).

Runs inside the API process via APScheduler; safe to also run as a separate
container executing this module directly.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.services.resend_client import send_email

logger = logging.getLogger(__name__)


async def expire_subscriptions() -> int:
    db = get_db()
    now = datetime.now(timezone.utc)
    result = await db.users.update_many(
        {"subscription.status": "active", "subscription.expires_at": {"$lt": now}},
        {"$set": {"subscription.status": "expired", "updated_at": now}},
    )
    if result.modified_count:
        logger.info("Expired %d subscriptions", result.modified_count)
    return result.modified_count


async def expire_listings() -> int:
    db = get_db()
    now = datetime.now(timezone.utc)
    result = await db.parcels.update_many(
        {"listing.status": "active", "listing.expires_at": {"$lt": now}},
        {"$set": {"listing.status": "expired", "listing.is_for_sale": False, "updated_at": now}},
    )
    if result.modified_count:
        logger.info("Expired %d listings", result.modified_count)
    return result.modified_count


async def send_renewal_reminders() -> None:
    """7-day and 1-day reminders; each reminder sent at most once per cycle."""
    db = get_db()
    now = datetime.now(timezone.utc)
    for days, flag in ((7, "reminder_7d_sent"), (1, "reminder_1d_sent")):
        cursor = db.users.find(
            {
                "subscription.status": "active",
                "subscription.expires_at": {"$gt": now, "$lt": now + timedelta(days=days)},
                f"subscription.{flag}": {"$ne": True},
            }
        )
        async for user in cursor:
            expires = user["subscription"]["expires_at"]
            await send_email(
                user["email"],
                "subscription_expiring",
                user.get("locale", "en"),
                date=expires.strftime("%Y-%m-%d"),
            )
            await db.users.update_one({"_id": user["_id"]}, {"$set": {f"subscription.{flag}": True}})

    # Listing expiry reminders (7 days)
    cursor = db.parcels.find(
        {
            "listing.status": "active",
            "listing.expires_at": {"$gt": now, "$lt": now + timedelta(days=7)},
            "listing.reminder_sent": {"$ne": True},
        }
    )
    async for parcel in cursor:
        owner = await db.users.find_one({"_id": parcel["current_owner_id"]})
        if owner:
            await send_email(
                owner["email"],
                "listing_expiring",
                owner.get("locale", "en"),
                parcel=parcel["parcel_reference"],
                date=parcel["listing"]["expires_at"].strftime("%Y-%m-%d"),
            )
        await db.parcels.update_one({"_id": parcel["_id"]}, {"$set": {"listing.reminder_sent": True}})


async def run_all_jobs() -> None:
    try:
        await expire_subscriptions()
        await expire_listings()
        await send_renewal_reminders()
    except Exception:
        logger.exception("Scheduled job run failed")


if __name__ == "__main__":
    from app.core.database import connect_db, close_db

    async def main() -> None:
        await connect_db()
        try:
            while True:
                await run_all_jobs()
                await asyncio.sleep(3600)
        finally:
            await close_db()

    asyncio.run(main())
