from unittest.mock import MagicMock, patch

import rag.embedder  # side-effect import: ensures module exists in sys.modules before patch resolves it
import pytest


def _make_encoding(*rows: list) -> MagicMock:
    """Wrap a list of vectors in a MagicMock that has .tolist(), mimicking numpy."""
    enc = MagicMock()
    enc.tolist.return_value = list(rows)
    return enc


@pytest.fixture(autouse=True)
def mock_sentence_transformer():
    fake_model = MagicMock()
    fake_model.encode.return_value = _make_encoding([0.1, 0.2, 0.3], [0.4, 0.5, 0.6])
    with patch("rag.embedder._model", fake_model):
        yield fake_model


def test_embed_single_text(mock_sentence_transformer):
    mock_sentence_transformer.encode.return_value = _make_encoding([0.1, 0.2, 0.3])
    from rag.embedder import embed

    result = embed(["flight from JFK to LAX"])
    assert isinstance(result, list)
    assert len(result) == 1
    assert isinstance(result[0], list)
    assert all(isinstance(v, float) for v in result[0])


def test_embed_multiple_texts():
    from rag.embedder import embed

    result = embed(["JFK to LAX", "ORD to MIA"])
    assert len(result) == 2
    assert len(result[0]) == len(result[1])


def test_embed_empty_returns_empty():
    from rag.embedder import embed

    result = embed([])
    assert result == []


def test_embed_calls_model_with_correct_args(mock_sentence_transformer):
    mock_sentence_transformer.encode.return_value = _make_encoding([0.0])
    from rag.embedder import embed

    embed(["test text"])
    mock_sentence_transformer.encode.assert_called_once_with(
        ["test text"], show_progress_bar=False
    )
