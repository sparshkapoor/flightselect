import logging
from rag.config import RAG_BACKEND, GEMINI_API_KEY, OLLAMA_BASE_URL, OLLAMA_MODEL

logger = logging.getLogger(__name__)


def complete(system_prompt: str, user_content: str) -> str:
    """Route to the configured LLM backend and return the response text."""
    if RAG_BACKEND == "gemini":
        return _gemini(system_prompt, user_content)
    return _ollama(system_prompt, user_content)


def _ollama(system_prompt: str, user_content: str) -> str:
    try:
        from openai import OpenAI  # openai SDK talking to Ollama's compatible endpoint

        client = OpenAI(base_url=OLLAMA_BASE_URL, api_key="unused", timeout=120.0)
        resp = client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            max_tokens=2000,
            temperature=0.3,
        )
        return resp.choices[0].message.content or ""
    except Exception as exc:
        logger.error("Ollama completion failed: %s: %s", type(exc).__name__, exc)
        return "Unable to generate a response from the local model."


def _gemini(system_prompt: str, user_content: str) -> str:
    try:
        from google import genai  # type: ignore[import]

        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set")
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"{system_prompt}\n\n{user_content}",
        )
        return response.text
    except Exception as exc:
        err_str = str(exc)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
            logger.warning("Gemini quota exceeded — falling back to Ollama")
            return _ollama(system_prompt, user_content)
        logger.error("Gemini completion failed: %s: %s", type(exc).__name__, exc)
        return "Unable to generate a response."
