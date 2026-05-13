import logging
from sentence_transformers import SentenceTransformer
from rag.config import EMBED_MODEL

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading embedding model %s", EMBED_MODEL)
        _model = SentenceTransformer(EMBED_MODEL)
    return _model


def embed(texts: list[str]) -> list[list[float]]:
    """Return one embedding vector per input text."""
    if not texts:
        return []
    model = _get_model()
    return model.encode(texts, show_progress_bar=False).tolist()
