from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, object_id
from app.core.rate_limit import rate_limit
from app.core.security import (
    create_access_token,
    create_email_verify_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.common import serialize, utcnow
from app.models.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.services.resend_client import send_email

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "landchain_refresh"
USER_PUBLIC_EXCLUDE = {"password_hash"}


def _public_user(user: dict) -> dict:
    return serialize(user, exclude=USER_PUBLIC_EXCLUDE)


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=settings.JWT_REFRESH_EXPIRE_DAYS * 86400,
        httponly=True,
        secure=settings.ENV == "production",
        samesite="lax",
        path="/auth",
    )


async def _store_refresh_jti(user_id: str, token: str) -> None:
    payload = decode_token(token, "refresh")
    assert payload is not None
    db = get_db()
    await db.refresh_tokens.insert_one(
        {
            "jti": payload["jti"],
            "user_id": user_id,
            "expires_at": datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
            "created_at": utcnow(),
        }
    )


@router.post("/register", status_code=201, dependencies=[Depends(rate_limit(10, 3600, "register"))])
async def register(body: RegisterRequest, background: BackgroundTasks):
    db = get_db()
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    now = utcnow()
    user_doc = {
        "name": body.name,
        "email": body.email.lower(),
        "phone": body.phone,
        "password_hash": hash_password(body.password),
        "role": "citizen",
        "locale": body.locale,
        "status": "pending_verification",
        "kyc_status": "not_started",
        "subscription": {"plan": None, "status": "none", "started_at": None, "expires_at": None, "last_payment_id": None},
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_email_verify_token(user_id)
    link = f"{settings.FRONTEND_URL}/{body.locale}/verify-email?token={token}"
    background.add_task(send_email, body.email.lower(), "verify_email", body.locale, link=link)

    return {"message": "Account created. Check your email to verify your account.", "user_id": user_id}


@router.get("/verify-email")
async def verify_email(token: str):
    payload = decode_token(token, "email_verify")
    if payload is None:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    db = get_db()
    result = await db.users.update_one(
        {"_id": object_id(payload["sub"]), "status": "pending_verification"},
        {"$set": {"status": "active", "updated_at": utcnow()}},
    )
    user = await db.users.find_one({"_id": object_id(payload["sub"])})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Email verified. You can now log in.", "already_verified": result.modified_count == 0}


@router.post(
    "/resend-verification",
    dependencies=[Depends(rate_limit(5, 3600, "resend_verify"))],
)
async def resend_verification(body: ResendVerificationRequest, background: BackgroundTasks):
    """Resend the email verification link (requires correct password)."""
    db = get_db()
    user = await db.users.find_one({"email": body.email.lower()})
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user["status"] == "active":
        return {"message": "This account is already verified. You can log in."}
    if user["status"] == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended — contact support")
    if user["status"] != "pending_verification":
        raise HTTPException(status_code=400, detail="Account cannot be verified at this time")

    user_id = str(user["_id"])
    locale = user.get("locale", "fr")
    token = create_email_verify_token(user_id)
    link = f"{settings.FRONTEND_URL}/{locale}/verify-email?token={token}"
    background.add_task(send_email, user["email"], "verify_email", locale, link=link)
    return {"message": "Verification email sent. Check your inbox."}


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(rate_limit(20, 900, "login"))])
async def login(body: LoginRequest, response: Response):
    db = get_db()
    user = await db.users.find_one({"email": body.email.lower()})
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user["status"] == "pending_verification":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "email_not_verified",
                "message": "Please verify your email before logging in",
            },
        )
    if user["status"] == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended — contact support")

    user_id = str(user["_id"])
    access = create_access_token(user_id, user["role"])
    refresh = create_refresh_token(user_id)
    await _store_refresh_jti(user_id, refresh)
    _set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=access, user=_public_user(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_token(token, "refresh")
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    db = get_db()
    stored = await db.refresh_tokens.find_one({"jti": payload["jti"]})
    if stored is None:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    user = await db.users.find_one({"_id": object_id(payload["sub"])})
    if user is None or user["status"] == "suspended":
        raise HTTPException(status_code=401, detail="User unavailable")

    # Rotate: revoke old, issue new
    await db.refresh_tokens.delete_one({"jti": payload["jti"]})
    user_id = str(user["_id"])
    access = create_access_token(user_id, user["role"])
    new_refresh = create_refresh_token(user_id)
    await _store_refresh_jti(user_id, new_refresh)
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=access, user=_public_user(user))


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        payload = decode_token(token, "refresh")
        if payload:
            await get_db().refresh_tokens.delete_one({"jti": payload["jti"]})
    response.delete_cookie(REFRESH_COOKIE, path="/auth")
    return {"message": "Logged out"}


@router.post("/forgot-password", dependencies=[Depends(rate_limit(5, 3600, "forgot_pw"))])
async def forgot_password(body: ForgotPasswordRequest, background: BackgroundTasks):
    db = get_db()
    user = await db.users.find_one({"email": body.email.lower()})
    if user:
        token = create_password_reset_token(str(user["_id"]))
        locale = user.get("locale", "en")
        link = f"{settings.FRONTEND_URL}/{locale}/reset-password?token={token}"
        background.add_task(send_email, user["email"], "password_reset", locale, link=link)
    # Same response either way — don't leak account existence
    return {"message": "If an account exists for this email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    payload = decode_token(body.token, "password_reset")
    if payload is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    db = get_db()
    result = await db.users.update_one(
        {"_id": object_id(payload["sub"])},
        {"$set": {"password_hash": hash_password(body.password), "updated_at": utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    # Revoke all refresh tokens for this user
    await db.refresh_tokens.delete_many({"user_id": payload["sub"]})
    return {"message": "Password updated. You can now log in."}


@router.get("/me")
async def me(user: Annotated[dict, Depends(get_current_user)]):
    return _public_user(user)
