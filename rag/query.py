"""
Entry point: python -m rag.query "cheapest flights from JFK to LAX in July"

Embeds the question, retrieves the most relevant flight records from ChromaDB,
and passes them as context to the configured LLM backend.
"""
import logging
import sys
from datetime import date

from rag.embedder import embed
from rag.llm_client import complete
from rag.vectorstore import retrieve, retrieve_with_metadata

logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# General-purpose prompt — used for CLI queries
_GENERAL_PROMPT = (
    "You are a concise flight price analyst. "
    "Answer using ONLY the flight records provided. "
    "1-2 sentences max. Cite specific prices from the data. "
    "If the records lack enough information, reply with exactly: insufficient data"
)

# Comparison-specific prompt — used when the UI sends structured comparison context.
# Tighter constraints produce shorter, more useful card text.
_COMPARISON_PROMPT = (
    "You are a flight price analyst writing a one-sentence insight for a travel app UI. "
    "Using the flight records below, assess whether the given price is high, low, or typical "
    "for the route, and give ONE concrete reason grounded in the records or the stated search "
    "context. Do NOT name specific airports — refer to 'this route' instead. "
    "If the question states how many days before departure the search was made, you may note "
    "whether that proximity plausibly explains a high price, and whether flexible dates were "
    "already used — only suggest trying flexible dates if the question says they were NOT used. "
    "Never invent a booking-window or flexible-date claim that isn't stated in the question. "
    "Reply in one sentence, 32 words max. No markdown, no bullet points. "
    "If records are insufficient, reply with exactly: insufficient data"
)


# Knowledge prompt — grounds soft-factor insights (bag fees, card waivers,
# points/transfer value) in the ingested docs/ knowledge, never the flight rows.
# Written defensively for a small local model: explicit length cap and a hard
# ban on quoting/copying, because a weak model's failure mode here is dumping
# a retrieved chunk back near-verbatim (including the source markdown's own
# bold/bullet syntax) instead of synthesizing — that's a real failure observed
# in testing, not a hypothetical.
_KNOWLEDGE_PROMPT = (
    "You are a travel-rewards analyst writing ONE short insight for a flight comparison UI. "
    "Read the reference facts below, then WRITE YOUR OWN sentence — do not copy, quote, or "
    "paraphrase closely from the reference text, and do not repeat its headings or labels. "
    "Pick the single most relevant bag-fee, credit-card, or points/miles consideration for "
    "this itinerary and state it in your own words, naming the specific card or program. "
    "Maximum 30 words, ONE sentence, plain prose only — no markdown, no bold, no bullet points, "
    "no headings, no numbered lists. "
    "When a fact is dated, phrase it as 'as of {its date}'. "
    "Only mention a time-limited transfer bonus if TODAY falls within its stated active window. "
    "If nothing in the references is relevant, reply with exactly: insufficient data"
)


def _ym(value: str) -> str:
    """Normalize a date-ish string to YYYY-MM for safe lexical comparison."""
    return (value or "")[:7]


def query_knowledge(
    itinerary_summary: str,
    airlines: list[str] | None = None,
    n_results: int = 3,
    today: date | None = None,
) -> dict:
    """Retrieve soft-factor knowledge and synthesize a grounded insight.

    Returns {answer, as_of, stale}: `as_of` is the oldest verification date among
    the chunks actually used, and `stale` is True when today is past the earliest
    review_after — so the UI can flag "verify" without guessing.
    """
    today = today or date.today()
    today_ym = today.strftime("%Y-%m")

    airline_hint = f" Airlines in results: {', '.join(airlines)}." if airlines else ""
    question = f"{itinerary_summary}{airline_hint}"

    [q_embedding] = embed([question])
    pairs = retrieve_with_metadata(
        q_embedding, n_results=n_results, where={"kind": "knowledge"}
    )
    if not pairs:
        return {"answer": "insufficient data", "as_of": "", "stale": False}

    as_ofs = [m.get("as_of", "") for _, m in pairs if m.get("as_of")]
    reviews = [m.get("review_after", "") for _, m in pairs if m.get("review_after")]
    oldest_as_of = min(as_ofs) if as_ofs else ""
    earliest_review = min(reviews) if reviews else ""
    stale = bool(earliest_review) and today_ym > _ym(earliest_review)

    context = "\n\n".join(f"- {doc}" for doc, _ in pairs)
    user_content = (
        f"Today's date: {today.isoformat()}\n\n"
        f"Reference facts:\n{context}\n\n"
        f"Itinerary: {question}"
    )
    answer = complete(_KNOWLEDGE_PROMPT, user_content)
    return {"answer": answer, "as_of": oldest_as_of, "stale": stale}


def query(
    question: str,
    n_results: int = 5,
    mode: str = "general",
    where: dict | None = None,
) -> str:
    """
    Retrieve relevant flights and generate a grounded answer.

    mode: "general" for CLI use, "comparison" for the UI card (tighter output).
    where: optional Chroma metadata filter (e.g. scope retrieval to one route)
           so an answer is never grounded in an unrelated search's flights.
    """
    if not question.strip():
        return "Please provide a non-empty question."

    [question_embedding] = embed([question])
    context_docs = retrieve(question_embedding, n_results=n_results, where=where)

    if not context_docs:
        # Same sentinel the LLM uses when context is thin — the caller (and the
        # client) already treats this as "not ready," not as a real answer.
        return "insufficient data"

    context = "\n".join(f"- {doc}" for doc in context_docs)
    user_content = f"Flight records:\n{context}\n\nQuestion: {question}"

    system = _COMPARISON_PROMPT if mode == "comparison" else _GENERAL_PROMPT
    return complete(system, user_content)


def main() -> None:
    if len(sys.argv) < 2:
        logger.error('Usage: python -m rag.query "your question here"')
        sys.exit(1)

    question = " ".join(sys.argv[1:])
    answer = query(question, mode="general")
    print(answer)


if __name__ == "__main__":
    main()
