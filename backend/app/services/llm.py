"""Thin Gemini wrapper (google-genai)."""
import json
import re
import time
from functools import lru_cache

from app.core.config import get_settings

MAX_RETRIES = 3
TRANSIENT_CODES = {429, 500, 502, 503, 504}


class LLMError(Exception):
    """The AI service is unavailable, misconfigured, or returned unusable output."""


@lru_cache
def _client():
    key = get_settings().gemini_api_key
    if not key:
        raise LLMError("GEMINI_API_KEY is not set. Add it to backend/.env and restart the server.")
    from google import genai
    from google.genai import types

    return genai.Client(api_key=key, http_options=types.HttpOptions(timeout=45_000))


def generate(prompt: str, *, system: str | None = None, json_mode: bool = False, temperature: float = 0.1) -> str:
    from google.genai import errors, types

    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=temperature,
        response_mime_type="application/json" if json_mode else None,
    )
    text = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = _client().models.generate_content(model=get_settings().llm_model, contents=prompt, config=config)
            text = resp.text
            break
        except LLMError:
            raise
        except errors.APIError as e:
            code = getattr(e, "code", None)
            if code in TRANSIENT_CODES and attempt < MAX_RETRIES - 1:
                time.sleep(1.5 * (attempt + 1))
                continue
            msg = "The AI service is busy right now; please try again in a moment." if code in TRANSIENT_CODES else str(getattr(e, "message", e))[:200]
            raise LLMError(f"AI service error ({code}): {msg}") from None
        except Exception as e:  # network, timeout, SDK errors
            if attempt < MAX_RETRIES - 1:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise LLMError(f"AI service unreachable: {type(e).__name__}") from None
    if not text or not text.strip():
        raise LLMError("The AI returned an empty response.")
    return text.strip()


def generate_json(prompt: str, *, system: str | None = None) -> dict:
    text = generate(prompt, system=system, json_mode=True)
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise LLMError("The AI returned malformed JSON.") from None
    if not isinstance(data, dict):
        raise LLMError("The AI returned an unexpected JSON shape.")
    return data
