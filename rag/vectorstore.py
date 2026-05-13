import logging
import chromadb
from rag import config

logger = logging.getLogger(__name__)


def _collection() -> chromadb.Collection:
    client = chromadb.PersistentClient(path=config.CHROMA_PATH)
    return client.get_or_create_collection(config.COLLECTION_NAME)


def ingest(
    documents: list[str],
    embeddings: list[list[float]],
    ids: list[str],
    metadatas: list[dict] | None = None,
) -> None:
    if not documents:
        logger.warning("ingest called with empty documents list — nothing written")
        return
    if len(documents) != len(embeddings) or len(documents) != len(ids):
        raise ValueError("documents, embeddings, and ids must have the same length")

    col = _collection()
    col.add(
        documents=documents,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas or [{} for _ in documents],
    )
    logger.info("Wrote %d documents to collection '%s'", len(documents), config.COLLECTION_NAME)


def retrieve(query_embedding: list[float], n_results: int | None = None) -> list[str]:
    """Return the top-n most similar document strings."""
    n = n_results if n_results is not None else config.RETRIEVE_N
    col = _collection()
    results = col.query(query_embeddings=[query_embedding], n_results=n)
    docs: list[str] = (results.get("documents") or [[]])[0]
    logger.info("Retrieved %d documents", len(docs))
    return docs
