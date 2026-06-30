import logging
import chromadb
from rag import config

logger = logging.getLogger(__name__)


def _collection() -> chromadb.Collection:
    client = chromadb.PersistentClient(path=config.CHROMA_PATH)
    return client.get_or_create_collection(config.COLLECTION_NAME)


# Chroma rejects a single add() above this size (its own max_batch_size,
# observed at 5461) — chunk so callers can pass arbitrarily large ingests
# (e.g. the DOT BTS seed, tens of thousands of rows) without knowing this.
_MAX_BATCH_SIZE = 5000


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

    metadatas = metadatas or [{} for _ in documents]
    col = _collection()
    for start in range(0, len(documents), _MAX_BATCH_SIZE):
        end = start + _MAX_BATCH_SIZE
        # upsert (not add) so callers with stable ids — e.g. the knowledge-doc
        # ingest, where re-running on an edited doc must replace the chunk in
        # place rather than error on a duplicate id — are idempotent. The flight
        # paths use unique time/search-id-based ids, so upsert behaves like add
        # for them.
        col.upsert(
            documents=documents[start:end],
            embeddings=embeddings[start:end],
            ids=ids[start:end],
            metadatas=metadatas[start:end],
        )
    logger.info("Wrote %d documents to collection '%s'", len(documents), config.COLLECTION_NAME)


def retrieve(
    query_embedding: list[float],
    n_results: int | None = None,
    where: dict | None = None,
) -> list[str]:
    """Return the top-n most similar document strings, optionally scoped by metadata filter."""
    n = n_results if n_results is not None else config.RETRIEVE_N
    col = _collection()
    results = col.query(query_embeddings=[query_embedding], n_results=n, where=where)
    docs: list[str] = (results.get("documents") or [[]])[0]
    logger.info("Retrieved %d documents (where=%s)", len(docs), where)
    return docs


def retrieve_with_metadata(
    query_embedding: list[float],
    n_results: int | None = None,
    where: dict | None = None,
) -> list[tuple[str, dict]]:
    """Like retrieve(), but pairs each document with its metadata.

    Used by knowledge retrieval, which needs each chunk's as_of/review_after to
    compute and surface freshness alongside the answer.
    """
    n = n_results if n_results is not None else config.RETRIEVE_N
    col = _collection()
    results = col.query(query_embeddings=[query_embedding], n_results=n, where=where)
    docs: list[str] = (results.get("documents") or [[]])[0]
    metas: list[dict] = (results.get("metadatas") or [[]])[0]
    logger.info("Retrieved %d documents w/ metadata (where=%s)", len(docs), where)
    return list(zip(docs, metas))
