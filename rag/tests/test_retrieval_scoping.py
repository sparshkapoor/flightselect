"""
Functional test: a query scoped to one route must never be grounded in a
different, unrelated route's ingested flights.

This is the actual bug that made the AI insight card feel inaccurate —
retrieval used to search the entire vector store with no metadata filter.
"""
import pytest

from rag import config
from rag.embedder import embed
from rag.query import query as rag_query
from rag.vectorstore import ingest, retrieve


@pytest.fixture(autouse=True)
def isolated_chroma(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "CHROMA_PATH", str(tmp_path / "chroma"))
    monkeypatch.setattr(config, "COLLECTION_NAME", "test_flights")


def test_route_scoped_retrieval_never_returns_a_different_routes_flights():
    jfk_lax_docs = [
        "Flight from JFK to LAX on 2026-07-01, Delta, $310, 6h 0m",
        "Flight from JFK to LAX on 2026-07-02, United, $295, 5h 50m",
    ]
    ewr_sfo_docs = [
        "Flight from EWR to SFO on 2026-07-01, JetBlue, $280, 6h 10m",
        "Flight from EWR to SFO on 2026-07-02, Alaska, $305, 6h 5m",
    ]

    ingest(
        jfk_lax_docs,
        embed(jfk_lax_docs),
        ["jfk-lax-0", "jfk-lax-1"],
        [{"origin": "JFK", "destination": "LAX"}, {"origin": "JFK", "destination": "LAX"}],
    )
    ingest(
        ewr_sfo_docs,
        embed(ewr_sfo_docs),
        ["ewr-sfo-0", "ewr-sfo-1"],
        [{"origin": "EWR", "destination": "SFO"}, {"origin": "EWR", "destination": "SFO"}],
    )

    [question_embedding] = embed(["Is $300 a good price for this route?"])
    scoped = retrieve(
        question_embedding,
        n_results=5,
        where={"$and": [{"origin": "JFK"}, {"destination": "LAX"}]},
    )

    assert scoped, "expected at least one matching document for the requested route"
    assert all("JFK to LAX" in doc for doc in scoped)
    assert not any("EWR to SFO" in doc for doc in scoped)


def test_query_reports_insufficient_data_instead_of_a_raw_fallback_sentence():
    # A fresh search whose flights haven't been ingested yet (or a route with
    # nothing in the store) must signal "not ready" using the same sentinel the
    # client already treats as a no-op, not a confusing literal sentence.
    answer = rag_query(
        "Is $300 a good price for this route?",
        where={"$and": [{"origin": "JFK"}, {"destination": "LAX"}]},
    )

    assert answer == "insufficient data"
