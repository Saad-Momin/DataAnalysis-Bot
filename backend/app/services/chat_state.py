"""In-memory conversation state (history for follow-ups + the pending visualization offer)."""
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

TTL_S = 2 * 60 * 60
MAX_CONVERSATIONS = 500
MAX_HISTORY = 6


@dataclass
class Conversation:
    id: str
    dataset_id: str
    user_id: str
    history: list[dict[str, str]] = field(default_factory=list)  # {"q","a","code"}
    pending_viz: dict[str, Any] | None = None  # {"question","code","summary"}
    updated: float = field(default_factory=time.time)

    def remember(self, q: str, a: str, code: str) -> None:
        self.history.append({"q": q, "a": a[:600], "code": code})
        del self.history[:-MAX_HISTORY]


_store: dict[str, Conversation] = {}
_lock = threading.Lock()


def get_or_create(conversation_id: str | None, dataset_id: str, user_id: str) -> Conversation:
    now = time.time()
    with _lock:
        for k in [k for k, c in _store.items() if now - c.updated > TTL_S]:
            del _store[k]
        conv = _store.get(conversation_id or "")
        if conv is None or conv.dataset_id != dataset_id or conv.user_id != user_id:
            if len(_store) >= MAX_CONVERSATIONS:
                del _store[min(_store, key=lambda k: _store[k].updated)]
            conv = Conversation(id=uuid.uuid4().hex, dataset_id=dataset_id, user_id=user_id)
            _store[conv.id] = conv
        conv.updated = now
        return conv


def purge_user(user_id: str) -> None:
    with _lock:
        for k in [k for k, c in _store.items() if c.user_id == user_id]:
            del _store[k]


def purge_dataset(dataset_id: str) -> None:
    with _lock:
        for k in [k for k, c in _store.items() if c.dataset_id == dataset_id]:
            del _store[k]
