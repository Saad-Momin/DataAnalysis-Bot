from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import current_user
from app.db.database import User

from app.core.errors import DatasetNotFound
from app.core.ratelimit import RateLimiter
from app.models.schemas import ChatRequest, ChatResponse
from app.services import chat_engine
from app.services.llm import LLMError

router = APIRouter(tags=["chat"])
limiter = RateLimiter(limit=30, window_s=60)  # each message costs 2-3 LLM calls


@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(limiter)])
def chat(req: ChatRequest, user: User = Depends(current_user)):
    try:
        return chat_engine.handle_message(req.dataset_id, req.message, req.conversation_id, user.id)
    except DatasetNotFound:
        raise HTTPException(404, "Dataset not found.")
    except LLMError as e:
        status = 503 if "GEMINI_API_KEY" in str(e) else 502
        raise HTTPException(status, str(e))
