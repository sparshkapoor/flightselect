"""
Functional test: knowledge docs and flight records share one collection but must
never bleed into each other's retrieval, and re-ingesting an edited knowledge doc
must replace chunks in place (stable ids + upsert) rather than duplicate them.
"""
import pytest

from rag import config
from rag.embedder import embed
from rag.ingest_docs import _parse_frontmatter, _split_sections, ingest_doc, DOCS_DIR
from rag.vectorstore import _collection, ingest, retrieve


@pytest.fixture(autouse=True)
def isolated_chroma(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "CHROMA_PATH", str(tmp_path / "chroma"))
    monkeypatch.setattr(config, "COLLECTION_NAME", "test_knowledge")


def test_frontmatter_parses_flat_keys_and_strips_body():
    meta, body = _parse_frontmatter(
        "---\ndoc_type: cards\nas_of: 2025-08\nsources:\n  - tpg.com\n---\n# Title\n\nhello"
    )
    assert meta["doc_type"] == "cards"
    assert meta["as_of"] == "2025-08"
    assert body.startswith("# Title")


def test_sections_split_on_h2_and_keep_preamble():
    headings = [h for h, _ in _split_sections("# Title\n\nintro line\n\n## One\na\n\n## Two\nb")]
    assert headings[0] == "Overview"  # title + intro folded in
    assert "One" in headings and "Two" in headings


def test_knowledge_and_flight_retrieval_do_not_bleed():
    # Ingest a flight row (kind=flight) and the real credit-cards doc (kind=knowledge).
    flight_docs = ["Flight from JFK to LAX on 2026-07-01, Delta, $310, 6h 0m"]
    ingest(flight_docs, embed(flight_docs), ["jfk-lax-0"],
           [{"kind": "flight", "origin": "JFK", "destination": "LAX"}])
    ingest_doc(DOCS_DIR / "credit-cards.md")

    [q] = embed(["which credit card waives the first checked bag on United"])

    knowledge = retrieve(q, n_results=3, where={"kind": "knowledge"})
    assert knowledge, "expected knowledge chunks"
    assert not any("Flight from" in d for d in knowledge)

    flights = retrieve(q, n_results=3, where={"$and": [{"origin": "JFK"}, {"destination": "LAX"}]})
    assert all("Flight from" in d for d in flights)


def test_reingest_replaces_chunks_in_place_no_duplicates():
    ingest_doc(DOCS_DIR / "points-miles.md")
    count_after_first = _collection().count()
    ingest_doc(DOCS_DIR / "points-miles.md")  # re-run
    assert _collection().count() == count_after_first, "re-ingest must upsert, not duplicate"
