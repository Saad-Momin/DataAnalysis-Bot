from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SECRET_KEY = "dev-insecure-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    app_env: str = "development"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    database_url: str = f"sqlite:///{(BASE_DIR / 'data' / 'metadata.db').as_posix()}"
    upload_dir: Path = BASE_DIR / "data" / "uploads"
    cache_dir: Path = BASE_DIR / "data" / "cache"
    max_upload_mb: int = 100

    secret_key: str = DEFAULT_SECRET_KEY
    frontend_url: str = "http://localhost:3000"
    session_days: int = 7

    gemini_api_key: str = ""
    llm_model: str = "gemini-3.5-flash"

    @field_validator("secret_key")
    @classmethod
    def _empty_secret_is_default(cls, v: str) -> str:
        return v.strip() or DEFAULT_SECRET_KEY

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @property
    def cookie_secure(self) -> bool:
        return self.is_production

    def validate_for_startup(self) -> None:
        if self.secret_key == DEFAULT_SECRET_KEY and self.is_production:
            raise RuntimeError("SECRET_KEY must be set to a long random value when APP_ENV=production.")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.upload_dir.mkdir(parents=True, exist_ok=True)
    s.cache_dir.mkdir(parents=True, exist_ok=True)
    return s
