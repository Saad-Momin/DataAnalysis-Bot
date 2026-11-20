import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy.exc import IntegrityError

from app.api.deps import current_user
from app.core.config import get_settings
from app.core.ratelimit import FailureTracker, RateLimiter
from app.core.security import (
    COOKIE_NAME,
    create_session_token,
    hash_password,
    hash_reset_token,
    new_reset_token,
    verify_password,
)
from app.db.database import PasswordResetToken, SessionLocal, User
from app.services import chat_state, dataset_store

log = logging.getLogger("app.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

login_ip_limiter = RateLimiter(limit=10, window_s=60)
signup_limiter = RateLimiter(limit=5, window_s=3600)
forgot_limiter = RateLimiter(limit=5, window_s=3600)
login_failures = FailureTracker(limit=5, window_s=15 * 60)  # per email (and per user for password confirmations)

RESET_TTL = timedelta(hours=1)
FORGOT_MESSAGE = "If an account exists for that email, a password reset link has been sent."


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def check_password_policy(v: str) -> str:
    if len(v) < 8 or len(v) > 128:
        raise ValueError("Password must be 8-128 characters.")
    if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
        raise ValueError("Password must contain at least one letter and one number.")
    return v


class _Model(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class _EmailModel(_Model):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()


class SignupRequest(_EmailModel):
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(max_length=256)

    @field_validator("password")
    @classmethod
    def _pw(cls, v: str) -> str:
        return check_password_policy(v)


class LoginRequest(_EmailModel):
    password: str = Field(min_length=1, max_length=256)


class ForgotRequest(_EmailModel):
    pass


class ProfileUpdate(_Model):
    name: str = Field(min_length=1, max_length=100)


class ChangePasswordRequest(_Model):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(max_length=256)

    @field_validator("new_password")
    @classmethod
    def _pw(cls, v: str) -> str:
        return check_password_policy(v)


class ResetRequest(_Model):
    token: str = Field(min_length=1, max_length=512)
    password: str = Field(max_length=256)

    @field_validator("password")
    @classmethod
    def _pw(cls, v: str) -> str:
        return check_password_policy(v)


class DeleteAccountRequest(_Model):
    password: str = Field(min_length=1, max_length=256)


def _user_json(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "created_at": u.created_at.isoformat()}


def _set_cookie(response: Response, user_id: str) -> None:
    s = get_settings()
    response.set_cookie(
        COOKIE_NAME,
        create_session_token(user_id),
        max_age=s.session_days * 86400,
        httponly=True,
        samesite="lax",
        secure=s.cookie_secure,
        path="/",
    )


def _clear_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True, samesite="lax", secure=get_settings().cookie_secure)


@router.post("/signup", status_code=201, dependencies=[Depends(signup_limiter)])
def signup(req: SignupRequest, response: Response):
    user = User(id=uuid.uuid4().hex, email=req.email, name=req.name, password_hash=hash_password(req.password))
    taken = HTTPException(409, "An account with this email already exists.")
    try:
        with SessionLocal() as s:
            if s.query(User).filter_by(email=req.email).first():
                raise taken
            s.add(user)
            s.commit()
    except IntegrityError:
        raise taken
    _set_cookie(response, user.id)
    return _user_json(user)


@router.post("/login", dependencies=[Depends(login_ip_limiter)])
def login(req: LoginRequest, response: Response):
    login_failures.check(req.email)
    with SessionLocal() as s:
        user = s.query(User).filter_by(email=req.email).first()
    if not verify_password(req.password, user.password_hash if user else None) or user is None:
        login_failures.fail(req.email)
        raise HTTPException(401, "Incorrect email or password.")
    login_failures.clear(req.email)
    _set_cookie(response, user.id)
    return _user_json(user)


@router.post("/logout", status_code=204)
def logout():
    resp = Response(status_code=204)
    _clear_cookie(resp)
    return resp


@router.get("/me")
def me(user: User = Depends(current_user)):
    return _user_json(user)


@router.patch("/me")
def update_me(req: ProfileUpdate, user: User = Depends(current_user)):
    with SessionLocal() as s:
        u = s.get(User, user.id)
        u.name = req.name
        s.commit()
        s.refresh(u)
    return _user_json(u)


def _confirm_password(user: User, password: str, message: str) -> None:
    key = f"pw:{user.id}"
    login_failures.check(key)
    if not verify_password(password, user.password_hash):
        login_failures.fail(key)
        raise HTTPException(400, message)
    login_failures.clear(key)


@router.post("/change-password", status_code=204)
def change_password(req: ChangePasswordRequest, user: User = Depends(current_user)):
    _confirm_password(user, req.current_password, "Current password is incorrect.")
    with SessionLocal() as s:
        s.get(User, user.id).password_hash = hash_password(req.new_password)
        s.commit()
    return Response(status_code=204)


@router.post("/forgot-password", dependencies=[Depends(forgot_limiter)])
def forgot_password(req: ForgotRequest):
    cfg = get_settings()
    result: dict = {"message": FORGOT_MESSAGE}
    with SessionLocal() as s:
        user = s.query(User).filter_by(email=req.email).first()
        if user is not None:
            s.query(PasswordResetToken).filter_by(user_id=user.id, used_at=None).delete()
            raw, hashed = new_reset_token()
            s.add(PasswordResetToken(user_id=user.id, token_hash=hashed, expires_at=_now() + RESET_TTL))
            s.commit()
            url = f"{cfg.frontend_url.rstrip('/')}/reset-password?token={raw}"
            if not cfg.is_production:
                # No email provider yet: the link is only ever surfaced in the dev log.
                log.info("Password reset link for %s: %s", user.email, url)
            if cfg.app_env.strip().lower() == "development":
                result["dev_reset_url"] = url
    return result


@router.post("/reset-password", status_code=204)
def reset_password(req: ResetRequest):
    bad = HTTPException(400, "This reset link is invalid or has expired.")
    with SessionLocal() as s:
        tok = s.query(PasswordResetToken).filter_by(token_hash=hash_reset_token(req.token)).first()
        if tok is None or tok.used_at is not None or tok.expires_at < _now():
            raise bad
        user = s.get(User, tok.user_id)
        if user is None:
            raise bad
        user.password_hash = hash_password(req.password)
        tok.used_at = _now()
        s.commit()
        login_failures.clear(user.email)
    return Response(status_code=204)


@router.delete("/me", status_code=204)
def delete_me(req: DeleteAccountRequest, user: User = Depends(current_user)):
    _confirm_password(user, req.password, "Incorrect password.")
    dataset_store.delete_all_for_owner(user.id)
    chat_state.purge_user(user.id)
    with SessionLocal() as s:
        s.query(PasswordResetToken).filter_by(user_id=user.id).delete()
        s.query(User).filter_by(id=user.id).delete()
        s.commit()
    resp = Response(status_code=204)
    _clear_cookie(resp)
    return resp
