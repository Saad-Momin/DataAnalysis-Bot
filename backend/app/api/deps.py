from fastapi import HTTPException, Request

from app.core.security import COOKIE_NAME, decode_session_token
from app.db.database import SessionLocal, User


def current_user(request: Request) -> User:
    token = request.cookies.get(COOKIE_NAME)
    user_id = decode_session_token(token) if token else None
    if user_id:
        with SessionLocal() as s:
            user = s.get(User, user_id)
        if user is not None:
            return user
    raise HTTPException(401, "Not authenticated.")
