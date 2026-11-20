from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.core.config import get_settings

_settings = get_settings()

engine = create_engine(
    _settings.database_url,
    connect_args={"check_same_thread": False} if _settings.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # sha256 hex; raw token is never stored
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(320))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class DatasetRecord(Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(255))
    rows: Mapped[int] = mapped_column(Integer)
    n_columns: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    owner_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("users.id"), index=True, nullable=True)
    # JSON: {"profile": [...], "cleaning_report": {...}, "feature_report": {...}, "raw_file": str|null}
    meta_json: Mapped[str] = mapped_column(Text)


def _migrate_legacy() -> None:
    """Existing SQLite files predate accounts: add owner_id and drop ownerless legacy datasets (and their files)."""
    import json
    from pathlib import Path

    insp = inspect(engine)
    if "datasets" not in insp.get_table_names():
        return
    if "owner_id" not in {c["name"] for c in insp.get_columns("datasets")}:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE datasets ADD COLUMN owner_id VARCHAR(32) REFERENCES users(id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_datasets_owner_id ON datasets (owner_id)"))
    with SessionLocal() as s:
        legacy = s.query(DatasetRecord).filter(DatasetRecord.owner_id.is_(None)).all()
        for rec in legacy:
            paths = [_settings.cache_dir / f"{rec.id}.parquet"]
            try:
                raw = json.loads(rec.meta_json).get("raw_file")
                if raw:
                    paths.append(Path(raw))
            except Exception:
                pass
            for p in paths:
                try:
                    p.unlink(missing_ok=True)
                except OSError:
                    pass  # locked/absent files must never block startup
            s.delete(rec)
        s.commit()


def init_db() -> None:
    Base.metadata.create_all(engine)
    _migrate_legacy()
