"""Simple sliding-window rate limiter.

Uses Redis when REDIS_URL is configured, otherwise an in-memory fallback
(acceptable for v1 per spec §10.2). Applied to public endpoints such as
/verify quick-checks and /waitlist.
"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.deps import client_ip

_memory_buckets: dict[str, deque[float]] = defaultdict(deque)

_redis_client = None
if settings.REDIS_URL:
    try:
        import redis.asyncio as aioredis  # type: ignore

        _redis_client = aioredis.from_url(settings.REDIS_URL)
    except ImportError:
        _redis_client = None


def rate_limit(max_requests: int, window_seconds: int, scope: str):
    async def limiter(request: Request) -> None:
        key = f"rl:{scope}:{client_ip(request)}"
        if _redis_client is not None:
            try:
                count = await _redis_client.incr(key)
                if count == 1:
                    await _redis_client.expire(key, window_seconds)
                if count > max_requests:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many requests, please try again later",
                    )
                return
            except HTTPException:
                raise
            except Exception:
                pass  # fall through to in-memory on Redis failure

        now = time.monotonic()
        bucket = _memory_buckets[key]
        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()
        if len(bucket) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests, please try again later",
            )
        bucket.append(now)

    return limiter
