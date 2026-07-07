from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always allowed — merged with CORS_ORIGINS from .env
DEFAULT_CORS_ORIGINS: tuple[str, ...] = (
    "http://localhost:3000",
    "https://lanchain.land",
    "https://www.lanchain.land",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Core
    ENV: Literal["development", "production"] = "development"
    APP_NAME: str = "LandChain API"
    FRONTEND_URL: str = "https://lanchain.land"
    CORS_ORIGINS: str = "http://localhost:3000,https://lanchain.land,https://www.lanchain.land"

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
    EMAIL_LOGO_URL: str = (
        "https://bouvzl2icp.ufs.sh/f/OymSP2c12cOMFdwVHZGO54b7HVQ6KiX3LatyEeDZrMm1wWoF"
    )

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

    # AI — prefer GEMINI_API_KEY (Google Gemini vision); AI_MODEL_ENDPOINT is a legacy custom service URL
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    AI_MODEL_ENDPOINT: str = ""

    # Cache / rate limiting
    REDIS_URL: str = ""

    # Bootstrap super admin (created at startup if missing)
    SUPER_ADMIN_EMAIL: str = "admin@landchain.app"
    SUPER_ADMIN_PASSWORD: str = "ChangeMe123!"

    # Demo data — seed 20 map parcels on startup when DB has none (set false in prod if undesired)
    SEED_DEMO_DATA: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        from_env = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        # Preserve order, dedupe — production origins are always included
        return list(dict.fromkeys([*DEFAULT_CORS_ORIGINS, *from_env]))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
