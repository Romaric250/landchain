import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_db() -> AsyncIOMotorDatabase:
    assert _db is not None, "Database not initialized — call connect_db() first"
    return _db


async def connect_db() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    # Use db name from URI path if present, else fallback
    try:
        default_db = _client.get_default_database()
        _db = default_db
    except Exception:
        _db = _client[settings.MONGO_DB_NAME]
    await ensure_indexes()
    logger.info("Connected to MongoDB (%s)", _db.name)


async def close_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.kyc_submissions.create_index("user_id")
    await db.parcels.create_index("parcel_reference", unique=True)
    await db.parcels.create_index("current_owner_id")
    await db.parcels.create_index([("geojson", "2dsphere")])
    await db.transactions.create_index("parcel_id")
    await db.documents.create_index("parcel_id")
    await db.disputes.create_index("parcel_id")
    await db.payments.create_index("user_id")
    await db.payments.create_index("fapshi_trans_id")
    await db.waitlist_entries.create_index("email", unique=True)
    await db.refresh_tokens.create_index("jti", unique=True)
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
