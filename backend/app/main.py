import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import close_db, connect_db, get_db
from app.core.security import hash_password
from app.models.common import utcnow
from app.routers import admin, auth, disputes, documents, kyc, parcels, payments, waitlist
from app.services.seed_demo import seed_demo_parcels
from app.workers.subscription_check import run_all_jobs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("landchain")


async def seed_super_admin() -> None:
    db = get_db()
    existing = await db.users.find_one({"role": "super_admin"})
    if existing:
        return
    now = utcnow()
    await db.users.insert_one(
        {
            "name": "LandChain Super Admin",
            "email": settings.SUPER_ADMIN_EMAIL.lower(),
            "phone": "",
            "password_hash": hash_password(settings.SUPER_ADMIN_PASSWORD),
            "role": "super_admin",
            "locale": "en",
            "status": "active",
            "kyc_status": "verified",
            "subscription": {"plan": None, "status": "none", "started_at": None, "expires_at": None, "last_payment_id": None},
            "created_at": now,
            "updated_at": now,
        }
    )
    logger.info("Seeded super admin account: %s", settings.SUPER_ADMIN_EMAIL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await seed_super_admin()
    await seed_demo_parcels()
    scheduler = AsyncIOScheduler()
    scheduler.add_job(run_all_jobs, "interval", hours=1, id="subscription_check")
    scheduler.start()
    logger.info("LandChain API started (env=%s)", settings.ENV)
    yield
    scheduler.shutdown(wait=False)
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENV == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Consistent JSON error shape: {"detail": ...} (§10.2)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "landchain-api"}


app.include_router(auth.router)
app.include_router(kyc.router)
app.include_router(parcels.router)
app.include_router(documents.router)
app.include_router(payments.router)
app.include_router(payments.listing_router)
app.include_router(disputes.router)
app.include_router(waitlist.router)
app.include_router(admin.router)
