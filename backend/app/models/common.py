from datetime import datetime, timezone
from typing import Any

from bson import ObjectId


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def serialize(doc: dict | None, *, exclude: set[str] | None = None) -> dict | None:
    """Convert a MongoDB document into a JSON-safe dict (ObjectId → str)."""
    if doc is None:
        return None
    exclude = exclude or set()
    out: dict[str, Any] = {}
    for key, value in doc.items():
        if key in exclude:
            continue
        out_key = "id" if key == "_id" else key
        out[out_key] = _convert(value)
    return out


def _convert(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _convert(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_convert(v) for v in value]
    return value
