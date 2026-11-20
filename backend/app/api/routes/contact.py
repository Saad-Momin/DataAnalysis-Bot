from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.ratelimit import RateLimiter
from app.db.database import ContactMessage, SessionLocal

router = APIRouter(tags=["contact"])
limiter = RateLimiter(limit=5, window_s=3600)


class ContactRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(min_length=1, max_length=5000)


@router.post("/contact", status_code=201, dependencies=[Depends(limiter)])
def contact(req: ContactRequest):
    with SessionLocal() as s:
        s.add(ContactMessage(name=req.name, email=req.email, message=req.message))
        s.commit()
    return {"message": "Thanks! We received your message and will get back to you."}
