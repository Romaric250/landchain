"""Pydantic v2 request/response schemas for the LandChain API."""

from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

Locale = Literal["en", "fr"]
Role = Literal["citizen", "notary", "admin", "super_admin"]
SubscriptionPlan = Literal["monthly", "quarterly", "annual"]


# ---------------------------------------------------------------- Auth

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=6, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    locale: Locale = "fr"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResendVerificationRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


# ---------------------------------------------------------------- KYC

class KycSubmitRequest(BaseModel):
    id_document_url: str = Field(min_length=8)
    id_document_back_url: str | None = None
    selfie_url: str = Field(min_length=8)


class KycReviewRequest(BaseModel):
    notes: str = ""


# ---------------------------------------------------------------- Parcels

class GeoJSONGeometry(BaseModel):
    type: Literal["Point", "Polygon"]
    coordinates: list[Any]

    @field_validator("coordinates")
    @classmethod
    def not_empty(cls, v: list[Any]) -> list[Any]:
        if not v:
            raise ValueError("coordinates must not be empty")
        return v


class ParcelCreateRequest(BaseModel):
    parcel_reference: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9\-/_.]+$")
    geojson: GeoJSONGeometry
    region: str = Field(min_length=2, max_length=80)
    area_sqm: float = Field(gt=0)
    document_ids: list[str] = []


class ParcelTransferRequest(BaseModel):
    to_owner_email: EmailStr
    notary_email: EmailStr | None = None


class ListForSaleRequest(BaseModel):
    price_xaf: int = Field(ge=1000)


# ---------------------------------------------------------------- Documents

class DocumentUploadRequest(BaseModel):
    parcel_id: str
    file_url: str = Field(min_length=8)
    doc_type: Literal["land_title", "survey_plan", "sale_agreement", "tax_receipt", "other"] = "land_title"


# ---------------------------------------------------------------- Payments

class SubscribeRequest(BaseModel):
    plan: SubscriptionPlan


class ListingFeeRequest(BaseModel):
    parcel_id: str


# ---------------------------------------------------------------- Disputes

class DisputeCreateRequest(BaseModel):
    parcel_id: str
    description: str = Field(min_length=10, max_length=5000)


class DisputeUpdateRequest(BaseModel):
    status: Literal["open", "under_review", "resolved", "rejected"]
    resolution_notes: str = ""


# ---------------------------------------------------------------- Waitlist / Contact

class WaitlistRequest(BaseModel):
    email: EmailStr
    name: str | None = Field(default=None, max_length=120)
    locale: Locale = "fr"


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    message: str = Field(min_length=10, max_length=5000)


# ---------------------------------------------------------------- Admin

class UserAdminUpdateRequest(BaseModel):
    role: Role | None = None
    status: Literal["pending_verification", "active", "suspended"] | None = None


class ParcelAdminUpdateRequest(BaseModel):
    status: Literal["active", "disputed", "flagged"] | None = None
    notes: str = ""


class DocumentReviewRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    notes: str = ""


class ThemeSettings(BaseModel):
    primary: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    secondary: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    accent: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    background: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    text: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
