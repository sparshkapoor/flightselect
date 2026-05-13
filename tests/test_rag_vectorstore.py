from unittest.mock import MagicMock, patch

import rag.vectorstore  # side-effect import: ensures module exists in sys.modules before patch resolves it
import pytest


@pytest.fixture()
def mock_collection():
    col = MagicMock()
    col.query.return_value = {
        "documents": [["Flight from JFK to LAX on 2024-07-15, Delta, $299, 5h 30m"]],
    }
    with patch("rag.vectorstore._collection", return_value=col):
        yield col


def test_ingest_writes_documents(mock_collection):
    from rag.vectorstore import ingest

    ingest(
        documents=["Flight from JFK to LAX"],
        embeddings=[[0.1, 0.2, 0.3]],
        ids=["jfk-lax-0"],
        metadatas=[{"origin": "JFK"}],
    )
    mock_collection.add.assert_called_once()
    call_kwargs = mock_collection.add.call_args.kwargs
    assert call_kwargs["documents"] == ["Flight from JFK to LAX"]
    assert call_kwargs["ids"] == ["jfk-lax-0"]


def test_ingest_empty_does_nothing(mock_collection):
    from rag.vectorstore import ingest

    ingest(documents=[], embeddings=[], ids=[])
    mock_collection.add.assert_not_called()


def test_ingest_mismatched_lengths_raises():
    from rag.vectorstore import ingest

    with pytest.raises(ValueError, match="same length"):
        ingest(documents=["a", "b"], embeddings=[[0.1]], ids=["id-0"])


def test_retrieve_returns_documents(mock_collection):
    from rag.vectorstore import retrieve

    result = retrieve([0.1, 0.2, 0.3], n_results=1)
    assert len(result) == 1
    assert "JFK" in result[0]


def test_retrieve_passes_n_results(mock_collection):
    from rag.vectorstore import retrieve

    retrieve([0.0], n_results=7)
    mock_collection.query.assert_called_once_with(
        query_embeddings=[[0.0]], n_results=7
    )


def test_retrieve_empty_collection_returns_empty():
    col = MagicMock()
    col.query.return_value = {"documents": [[]]}
    with patch("rag.vectorstore._collection", return_value=col):
        from rag.vectorstore import retrieve

        result = retrieve([0.1])
        assert result == []
