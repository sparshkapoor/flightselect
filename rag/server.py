"""
FastAPI wrapper around rag/query.py.

Start: uvicorn rag.server:app --host 0.0.0.0 --port 8000
"""
import hashlib
import logging
import sys
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, field_validator

from rag import config as cfg
from rag.embedder import embed
from rag.query import query
from rag.vectorstore import ingest as vs_ingest

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


async def _verify_secret(x_rag_secret: str | None = Header(default=None)) -> None:
    if cfg.RAG_INTERNAL_SECRET and x_rag_secret != cfg.RAG_INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


class FlightRecord(BaseModel):
    origin: str
    destination: str
    date: str
    price: float
    airline: str
    duration_minutes: int


class IngestRequest(BaseModel):
    flights: list[FlightRecord]
    search_query_id: str = ""


class IngestResponse(BaseModel):
    ingested: int


def _flight_to_document(f: FlightRecord) -> str:
    hours, mins = divmod(f.duration_minutes, 60)
    duration = f"{hours}h {mins}m" if hours else f"{mins}m"
    return (
        f"Flight from {f.origin} to {f.destination} "
        f"on {f.date}, {f.airline}, "
        f"${f.price:.0f}, {duration}"
    )


@app.post("/ingest", response_model=IngestResponse, dependencies=[Depends(_verify_secret)])
async def handle_ingest(req: IngestRequest) -> IngestResponse:
    if not req.flights:
        return IngestResponse(ingested=0)

    documents = [_flight_to_document(f) for f in req.flights]
    ids = [
        f"{req.search_query_id}-{i}" if req.search_query_id else f"flight-{i}-{int(time.time())}"
        for i in range(len(documents))
    ]
    metadatas = [
        {
            "origin": f.origin,
            "destination": f.destination,
            "date": f.date,
            "price": f.price,
            "airline": f.airline,
        }
        for f in req.flights
    ]

    try:
        embeddings = embed(documents)
        vs_ingest(documents, embeddings, ids, metadatas)
        logger.info("Ingested %d flights for search_query_id=%s", len(documents), req.search_query_id)
    except Exception as exc:
        logger.error("Ingest failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status_code=500, detail="Ingest failed")

    return IngestResponse(ingested=len(documents))


class QueryRequest(BaseModel):
    question: str
    n_results: int = 5
    mode: str = "general"
    origin: str | None = None
    destination: str | None = None

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("question must not be empty")
        return v.strip()


class QueryResponse(BaseModel):
    answer: str


@app.post("/query", response_model=QueryResponse, dependencies=[Depends(_verify_secret)])
async def handle_query(req: QueryRequest) -> QueryResponse:
    # Scope retrieval to the specific route when the caller supplies one, so an
    # answer is never grounded in a different, unrelated search's flights.
    where = {"$and": [{"origin": req.origin}, {"destination": req.destination}]} if req.origin and req.destination else None

    key = _cache_key(req.question, req.mode)
    cached = _get_cached(key)
    if cached:
        logger.info("Cache hit for question (mode=%s)", req.mode)
        return QueryResponse(answer=cached)

    try:
        answer = query(req.question, n_results=req.n_results, mode=req.mode, where=where)
        # Don't cache the "not ready yet" sentinel — ingestion for a fresh search
        # may land moments later, and the client retries once after 10s expecting
        # a real answer by then, not a frozen miss for the rest of the TTL.
        if answer.strip().lower() != "insufficient data":
            _set_cached(key, answer)
        return QueryResponse(answer=answer)
    except Exception as exc:
        logger.error("Query failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status_code=500, detail="Query failed")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
