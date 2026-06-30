"""
One-time / idempotent seed: python -m rag.ingest_docs

Ingests the human-maintained knowledge docs in docs/ (credit-card bag benefits,
points & miles valuations) into the same ChromaDB collection the flight records
live in, tagged metadata `kind="knowledge"` so route-scoped flight retrieval
never returns them and knowledge retrieval never returns flights.

Chunking is section-aware: each `## ` heading starts a new chunk (the docs are
already structured by topic, and tables must stay intact inside their section).
Each chunk gets a stable id `knowledge-{doc_type}-{section-slug}`, so editing a
doc and re-running this replaces the chunk in place (vectorstore.ingest upserts).

Excludes llm-rag-design.md — that's the system's design spec, not retrievable
fact. Ignores the .pdf renders; the .md is the source of truth.
"""
import logging
import re
import sys
from pathlib import Path

from rag.embedder import embed
from rag.vectorstore import ingest

logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

DOCS_DIR = Path(__file__).parent.parent / "docs"

# Only these docs are retrievable knowledge. llm-rag-design.md is intentionally
# absent (meta-design, not fact).
KNOWLEDGE_DOCS = ["credit-cards.md", "points-miles.md"]


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """Split leading `---` YAML-ish frontmatter from the body.

    Dependency-free: handles the flat `key: value` lines and ignores list
    blocks (e.g. `sources:`) we don't index. Returns (metadata, body).
    """
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    raw = text[3:end].strip()
    body = text[end + 4:].lstrip("\n")

    meta: dict = {}
    for line in raw.splitlines():
        m = re.match(r"^([A-Za-z_]+):\s*(.+?)\s*$", line)
        if m:
            meta[m.group(1)] = m.group(2)
    return meta, body


def _slugify(heading: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
    return slug or "section"


def _split_sections(body: str) -> list[tuple[str, str]]:
    """Split markdown body into (heading, section_text) on `## ` headings.

    The document title (`# ...`) and any preamble before the first `## ` are
    folded into an "Overview" chunk so nothing is dropped.
    """
    lines = body.splitlines()
    sections: list[tuple[str, list[str]]] = []
    current_heading = "Overview"
    current_lines: list[str] = []

    for line in lines:
        if line.startswith("## "):
            if any(l.strip() for l in current_lines):
                sections.append((current_heading, current_lines))
            current_heading = line[3:].strip()
            current_lines = []
        elif line.startswith("# "):
            # Document title — keep as preamble context, don't start a section.
            current_lines.append(line)
        else:
            current_lines.append(line)

    if any(l.strip() for l in current_lines):
        sections.append((current_heading, current_lines))

    return [(h, "\n".join(ls).strip()) for h, ls in sections]


def ingest_doc(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(text)
    doc_type = meta.get("doc_type", path.stem)
    as_of = meta.get("as_of", "")
    review_after = meta.get("review_after", "")

    title_match = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else path.stem

    documents: list[str] = []
    ids: list[str] = []
    metadatas: list[dict] = []

    for heading, section_text in _split_sections(body):
        if not section_text:
            continue
        # Prepend title + heading so the section's topic is in the embedded
        # vector, not just the body prose — sharpens retrieval precision.
        documents.append(f"{title} — {heading}:\n{section_text}")
        ids.append(f"knowledge-{doc_type}-{_slugify(heading)}")
        metadatas.append({
            "kind": "knowledge",
            "doc_type": doc_type,
            "section": heading,
            "as_of": as_of,
            "review_after": review_after,
        })

    if not documents:
        logger.warning("%s produced no chunks — skipping", path.name)
        return 0

    embeddings = embed(documents)
    ingest(documents, embeddings, ids, metadatas)
    return len(documents)


def main() -> None:
    total = 0
    for name in KNOWLEDGE_DOCS:
        path = DOCS_DIR / name
        if not path.exists():
            logger.warning("Knowledge doc not found: %s", path)
            continue
        try:
            n = ingest_doc(path)
            total += n
            logger.info("Ingested %d chunks from %s", n, name)
        except Exception as exc:
            logger.error("Failed to ingest %s: %s: %s", name, type(exc).__name__, exc)

    logger.info("Done — %d total knowledge chunks ingested", total)


if __name__ == "__main__":
    main()
