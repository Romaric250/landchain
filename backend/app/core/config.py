from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Core
    ENV: Literal["development", "production"] = "development"
    APP_NAME: str = "LandChain API"
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"

    # Auth / JWT
    JWT_SECRET: str = "dev-only-secret-change-me-in-production-0123456789"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 30

    # Database
    MONGO_URI: str = "mongodb://localhost:27017/landchain"
    MONGO_DB_NAME: str = "landchain"

    # Email — Resend
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "LandChain <noreply@landchain.app>"

    # Payments — Fapshi
    FAPSHI_BASE_URL: str = "https://sandbox.fapshi.com"
    FAPSHI_API_USER: str = ""
    FAPSHI_API_KEY: str = ""
    FAPSHI_WEBHOOK_SECRET: str = ""

    # Pricing (XAF) — placeholder amounts, confirm before launch (§24.6)
    PRICE_SUBSCRIPTION_MONTHLY: int = 2000
    PRICE_SUBSCRIPTION_QUARTERLY: int = 5000
    PRICE_SUBSCRIPTION_ANNUAL: int = 18000
    PRICE_LISTING_FEE: int = 5000
    LISTING_DURATION_DAYS: int = 60

    # File storage — UploadThing
    UPLOADTHING_SECRET: str = ""
    UPLOADTHING_APP_ID: str = ""

    # Maps
    MAPBOX_ACCESS_TOKEN: str = ""

    # Blockchain
    POLYGON_RPC_URL: str = ""
    LANDREGISTRY_CONTRACT_ADDRESS: str = ""
    DEPLOYER_PRIVATE_KEY: str = ""

    # AI
    AI_MODEL_ENDPOINT: str = ""

    # Cache / rate limiting
    REDIS_URL: str = ""

    # Bootstrap super admin (created at startup if missing)
    SUPER_ADMIN_EMAIL: str = "admin@landchain.app"
    SUPER_ADMIN_PASSWORD: str = "ChangeMe123!"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
