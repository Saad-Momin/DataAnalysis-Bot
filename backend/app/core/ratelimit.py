"""Tiny in-memory sliding-window rate limiter (per client IP). Fine for a single process; use Redis to scale out."""
import threading
import time
from collections import defaultdict, deque

import weakref

from fastapi import HTTPException, Request

_instances: "weakref.WeakSet" = weakref.WeakSet()


def reset_all() -> None:
    """Clear every limiter's state (used by tests; limiter state is process-global)."""
    for i in list(_instances):
        i.reset()


class RateLimiter:
    def __init__(self, limit: int, window_s: int = 60):
        self.limit = limit
        self.window = window_s
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        _instances.add(self)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.limit:
                retry = max(1, int(self.window - (now - q[0])))
                raise HTTPException(
                    429,
                    f"Too many requests. Please wait {retry}s and try again.",
                    headers={"Retry-After": str(retry)},
                )
            q.append(now)
            if len(self._hits) > 5000:  # opportunistic cleanup of idle clients
                for k in [k for k, v in self._hits.items() if not v or now - v[-1] > self.window]:
                    self._hits.pop(k, None)

    def __call__(self, request: Request) -> None:
        self.check(request.client.host if request.client else "unknown")


class FailureTracker:
    """Counts failures per key in a sliding window; blocks (429) once `limit` is reached."""

    def __init__(self, limit: int, window_s: int):
        self.limit = limit
        self.window = window_s
        self._fails: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        _instances.add(self)

    def reset(self) -> None:
        with self._lock:
            self._fails.clear()

    def _prune(self, q: deque, now: float) -> None:
        while q and now - q[0] > self.window:
            q.popleft()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._fails.get(key)
            if q is None:
                return
            self._prune(q, now)
            if len(q) >= self.limit:
                retry = max(1, int(self.window - (now - q[0])))
                raise HTTPException(
                    429,
                    "Too many failed attempts. Please try again later.",
                    headers={"Retry-After": str(retry)},
                )
            if not q:
                self._fails.pop(key, None)

    def fail(self, key: str) -> None:
        with self._lock:
            self._fails[key].append(time.monotonic())

    def clear(self, key: str) -> None:
        with self._lock:
            self._fails.pop(key, None)
