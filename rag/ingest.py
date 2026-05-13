"""
Entry point: python -m rag.ingest data/flights/your_file.csv [...]

Reads one or more CSVs, converts each row to a natural-language document,
embeds them, and stores in ChromaDB.

Expected CSV columns (case-sensitive):
    origin, destination, date, price, airline, duration_minutes
"""
import csv
import logging
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

REQUIRED_COLUMNS = {"origin", "destination", "date", "price", "airline", "duration_minutes"}


def _safe_path(raw: str) -> Path:
    """Resolve path and reject anything outside data/ to prevent traversal."""
    resolved = Path(raw).resolve()
    data_root = (Path(__file__).parent.parent / "data").resolve()
    if not str(resolved).startswith(str(data_root)):
        raise ValueError(f"Path '{raw}' is outside the data/ directory")
    return resolved


def _row_to_document(row: dict) -> str:
    minutes = int(float(row["duration_minutes"]))
    hours, mins = divmod(minutes, 60)
    duration = f"{hours}h {mins}m" if hours else f"{mins}m"
    price = float(row["price"])
    return (
        f"Flight from {row['origin']} to {row['destination']} "
        f"on {row['date']}, {row['airline']}, "
        f"${price:.0f}, {duration}"
    )


def ingest_file(csv_path: str) -> int:
    """Ingest one CSV file. Returns the number of rows ingested."""
    path = _safe_path(csv_path)
    documents: list[str] = []
    ids: list[str] = []
    metadatas: list[dict] = []

    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        fieldnames = set(reader.fieldnames or [])
        missing = REQUIRED_COLUMNS - fieldnames
        if missing:
            raise ValueError(f"{path.name}: missing required columns {missing}")

        for i, row in enumerate(reader):
            try:
                doc = _row_to_document(row)
            except (ValueError, KeyError) as exc:
                logger.error("Skipping row %d in %s: %s", i, path.name, exc)
                continue

            documents.append(doc)
            ids.append(f"{path.stem}-{i}")
            metadatas.append({
                "origin": row["origin"],
                "destination": row["destination"],
                "date": row["date"],
                "price": float(row["price"]),
                "airline": row["airline"],
            })

    if not documents:
        logger.warning("%s produced no documents — skipping", path.name)
        return 0

    embeddings = embed(documents)
    ingest(documents, embeddings, ids, metadatas)
    return len(documents)


def main() -> None:
    paths = sys.argv[1:]
    if not paths:
        logger.error("Usage: python -m rag.ingest data/flights/file.csv [...]")
        sys.exit(1)

    total = 0
    for p in paths:
        try:
            n = ingest_file(p)
            total += n
            logger.info("Ingested %d rows from %s", n, p)
        except Exception as exc:
            logger.error("Failed to ingest %s: %s: %s", p, type(exc).__name__, exc)

    logger.info("Done — %d total documents ingested", total)


if __name__ == "__main__":
    main()
