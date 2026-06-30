"""
Functional test: knowledge docs and flight records share one collection but must
never bleed into each other's retrieval, and re-ingesting an edited knowledge doc
must replace chunks in place (stable ids + upsert) rather than duplicate them.
"""
import pytest

from rag import config
from rag.embedder import embed
from rag.ingest_docs import EXCLUDED_SECTIONS, _parse_frontmatter, _split_sections, ingest_doc, DOCS_DIR
from rag.vectorstore import _collection, delete_where, ingest, retrieve


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


def test_query_knowledge_returns_freshness_and_flags_stale(monkeypatch):
    from datetime import date

    import rag.query as q

    monkeypatch.setattr(q, "complete", lambda system, user: "Delta Amex waives the first bag.")
    ingest_doc(DOCS_DIR / "credit-cards.md")  # as_of 2025-08, review_after 2025-11

    fresh = q.query_knowledge("JFK to LAX on Delta", ["Delta"], today=date(2025, 9, 1))
    assert fresh["as_of"] == "2025-08"
    assert fresh["stale"] is False

    stale = q.query_knowledge("JFK to LAX on Delta", ["Delta"], today=date(2026, 6, 30))
    assert stale["stale"] is True, "past review_after must flag stale"


def test_query_knowledge_insufficient_data_on_empty_store():
    from datetime import date

    import rag.query as q

    out = q.query_knowledge("JFK to LAX", today=date(2026, 6, 30))
    assert out == {"answer": "insufficient data", "as_of": "", "stale": False}


def test_meta_sections_are_excluded_from_ingestion():
    # "Storage Schema" etc. are instructions for developers/the pipeline, not
    # user-facing facts — ingesting them let the LLM quote the pipeline's own
    # templates back at the user instead of a real card/program fact.
    ingest_doc(DOCS_DIR / "points-miles.md")
    stored = _collection().get(where={"$and": [{"kind": "knowledge"}, {"doc_type": "points"}]})
    sections = {m["section"] for m in stored["metadatas"]}
    assert {s.lower() for s in sections}.isdisjoint(EXCLUDED_SECTIONS)
    assert "CPP Valuations (2025)" in sections  # a real fact section survives


def test_delete_where_actually_prunes_stale_chunks():
    # Regression: delete_where's caller originally passed a flat multi-key
    # dict, which Chroma rejects ("Expected where to have exactly one
    # operator") — the delete silently raised and was swallowed by the
    # caller's try/except, so stale chunks never actually got removed.
    docs = ["stale chunk text"]
    ingest(docs, embed(docs), ["knowledge-cards-stale-section"],
           [{"kind": "knowledge", "doc_type": "cards", "section": "Stale Section"}])
    assert _collection().get(ids=["knowledge-cards-stale-section"])["ids"]

    delete_where({"$and": [{"kind": "knowledge"}, {"doc_type": "cards"}]})

    assert _collection().get(ids=["knowledge-cards-stale-section"])["ids"] == []


def test_reingest_prunes_a_section_removed_from_the_source_doc(tmp_path):
    # If a section is renamed or deleted in the source markdown, re-ingesting
    # must not leave the old section's chunk behind forever.
    doc = tmp_path / "cards.md"
    doc.write_text("---\ndoc_type: cards\n---\n# Title\n\n## Old Section\nfact one\n")
    ingest_doc(doc)
    before = _collection().get(where={"$and": [{"kind": "knowledge"}, {"doc_type": "cards"}]})
    assert "Old Section" in {m["section"] for m in before["metadatas"]}

    doc.write_text("---\ndoc_type: cards\n---\n# Title\n\n## New Section\nfact two\n")
    ingest_doc(doc)
    after = _collection().get(where={"$and": [{"kind": "knowledge"}, {"doc_type": "cards"}]})
    sections = {m["section"] for m in after["metadatas"]}
    assert "Old Section" not in sections
    assert "New Section" in sections
