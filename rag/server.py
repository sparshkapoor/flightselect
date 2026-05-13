"""
FastAPI wrapper around rag/query.py.

Start: uvicorn rag.server:app --host 0.0.0.0 --port 8000
"""
import hashlib
import logging
import sys
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator

from rag.query import query

logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# In-memory cache: question hash → (answer, timestamp)
# Keyed by question so identical comparison questions (same route+prices) never
# hit Gemini twice. TTL of 1 hour — long enough to survive a dev session.
_cache: dict[str, tuple[str, float]] = {}
_CACHE_TTL = 3600


def _cache_key(question: str, mode: str) -> str:
    return hashlib.md5(f"{mode}:{question}".encode()).hexdigest()


def _get_cached(key: str) -> str | None:
    entry = _cache.get(key)
    if entry and (time.time() - entry[1]) < _CACHE_TTL:
        return entry[0]
    return None


def _set_cached(key: str, answer: str) -> None:
    _cache[key] = (answer, time.time())


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("RAG server ready")
    yield


app = FastAPI(title="FlightSelect RAG", lifespan=lifespan)


class QueryRequest(BaseModel):
    question: str
    n_results: int = 5
    mode: str = "general"

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("question must not be empty")
        return v.strip()


class QueryResponse(BaseModel):
    answer: str


@app.post("/query", response_model=QueryResponse)
async def handle_query(req: QueryRequest) -> QueryResponse:
    key = _cache_key(req.question, req.mode)
    cached = _get_cached(key)
    if cached:
        logger.info("Cache hit for question (mode=%s)", req.mode)
        return QueryResponse(answer=cached)

    try:
        answer = query(req.question, n_results=req.n_results, mode=req.mode)
        _set_cached(key, answer)
        return QueryResponse(answer=answer)
    except Exception as exc:
        logger.error("Query failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status_code=500, detail="Query failed")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
