import sys
from unittest.mock import MagicMock, patch

import rag.llm_client  # must be imported before patches can resolve names in the module

SYSTEM = "You are a flight analyst."
USER = "What is the cheapest flight from JFK to LAX?"


# ---------------------------------------------------------------------------
# Routing tests — patch the name as bound in llm_client, not in config
# ---------------------------------------------------------------------------

def test_complete_routes_to_ollama_by_default():
    with patch("rag.llm_client.RAG_BACKEND", "ollama"), \
         patch("rag.llm_client._ollama", return_value="answer") as mock_ollama, \
         patch("rag.llm_client._gemini") as mock_gemini:
        from rag.llm_client import complete
        complete(SYSTEM, USER)

    mock_ollama.assert_called_once_with(SYSTEM, USER)
    mock_gemini.assert_not_called()


def test_complete_routes_to_gemini_when_configured():
    with patch("rag.llm_client.RAG_BACKEND", "gemini"), \
         patch("rag.llm_client._gemini", return_value="answer") as mock_gemini, \
         patch("rag.llm_client._ollama") as mock_ollama:
        from rag.llm_client import complete
        complete(SYSTEM, USER)

    mock_gemini.assert_called_once_with(SYSTEM, USER)
    mock_ollama.assert_not_called()


# ---------------------------------------------------------------------------
# Ollama path — mock openai via sys.modules so tests work whether or not
# the package is installed in the active venv
# ---------------------------------------------------------------------------

def _mock_openai(content: str) -> MagicMock:
    """Build a fake openai module whose client returns the given content."""
    mock_resp = MagicMock()
    mock_resp.choices[0].message.content = content
    mock_module = MagicMock()
    mock_module.OpenAI.return_value.chat.completions.create.return_value = mock_resp
    return mock_module


def test_ollama_path_returns_text():
    with patch.dict(sys.modules, {"openai": _mock_openai("The cheapest is $199 on Delta.")}):
        result = rag.llm_client._ollama(SYSTEM, USER)
    assert "$" in result or "cheapest" in result.lower()


def test_ollama_exception_returns_fallback():
    mock_module = MagicMock()
    mock_module.OpenAI.side_effect = Exception("connection refused")
    with patch.dict(sys.modules, {"openai": mock_module}):
        result = rag.llm_client._ollama(SYSTEM, USER)
    assert isinstance(result, str) and len(result) > 0


# ---------------------------------------------------------------------------
# Gemini path — mock google.generativeai via sys.modules
# ---------------------------------------------------------------------------

def _mock_google(text: str) -> MagicMock:
    """
    Build a fake `google` package whose `genai` submodule returns `text`
    from client.models.generate_content().text — matching the google.genai SDK.
    """
    mock_genai = MagicMock()
    mock_genai.Client.return_value.models.generate_content.return_value.text = text
    mock_google = MagicMock()
    mock_google.genai = mock_genai
    return mock_google, mock_genai


def test_gemini_path_returns_text():
    mock_google, mock_genai = _mock_google("Cheapest is $210 on United.")
    with patch.dict(sys.modules, {"google": mock_google, "google.genai": mock_genai}), \
         patch("rag.llm_client.GEMINI_API_KEY", "fake-key"):
        result = rag.llm_client._gemini(SYSTEM, USER)
    assert "$" in result or "cheapest" in result.lower()


def test_gemini_missing_key_returns_fallback():
    with patch("rag.llm_client.GEMINI_API_KEY", ""):
        result = rag.llm_client._gemini(SYSTEM, USER)
    assert isinstance(result, str) and len(result) > 0


def test_gemini_exception_returns_fallback():
    mock_genai = MagicMock()
    mock_genai.Client.side_effect = Exception("quota exceeded")
    mock_google = MagicMock()
    mock_google.genai = mock_genai
    with patch.dict(sys.modules, {"google": mock_google, "google.genai": mock_genai}), \
         patch("rag.llm_client.GEMINI_API_KEY", "fake-key"):
        result = rag.llm_client._gemini(SYSTEM, USER)
    assert isinstance(result, str) and len(result) > 0
