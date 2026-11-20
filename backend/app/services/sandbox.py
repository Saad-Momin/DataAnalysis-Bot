"""Parent-side wrapper: run generated code against a cached dataset in an isolated subprocess."""
import json
import os
import subprocess
import sys
import threading
from pathlib import Path

from app.services import dataset_store
from app.services.sandbox_runner import MARKER, CodeRejected, validate_code

RUNNER = Path(__file__).with_name("sandbox_runner.py")
TIMEOUT_S = 30
MAX_CONCURRENT = 4
QUEUE_WAIT_S = 20
_slots = threading.BoundedSemaphore(MAX_CONCURRENT)
_SECRET_HINTS = ("KEY", "TOKEN", "SECRET", "PASSWORD", "CREDENTIAL")


class SandboxError(Exception):
    """Generated code was rejected, failed, or timed out. The message is safe to show to the LLM/user."""


def _child_env() -> dict:
    return {k: v for k, v in os.environ.items() if not any(h in k.upper() for h in _SECRET_HINTS)}


def run_analysis(dataset_id: str, code: str, max_rows: int = 50) -> dict:
    try:
        validate_code(code)
    except CodeRejected as e:
        raise SandboxError(f"Code rejected: {e}") from None

    dataset_store.get_record(dataset_id)  # raises DatasetNotFound
    payload = json.dumps(
        {"parquet": str(dataset_store.parquet_path(dataset_id)), "code": code, "max_rows": max_rows}
    )
    # Bound concurrent child processes so a burst of requests cannot exhaust the machine.
    if not _slots.acquire(timeout=QUEUE_WAIT_S):
        raise SandboxError("The analysis engine is busy; please try again in a moment.")
    try:
        proc = subprocess.run(
            [sys.executable, "-I", str(RUNNER)],
            input=payload,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=TIMEOUT_S,
            env=_child_env(),
        )
    except subprocess.TimeoutExpired:
        raise SandboxError(f"Execution timed out after {TIMEOUT_S}s; make the computation lighter.") from None
    finally:
        _slots.release()

    out = proc.stdout or ""
    if MARKER not in out:
        raise SandboxError("The analysis process crashed (possibly out of memory).")
    data = json.loads(out.rsplit(MARKER, 1)[1].strip())
    if not data["ok"]:
        raise SandboxError(data["error"])
    return data["result"]
