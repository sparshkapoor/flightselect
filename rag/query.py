"""
Entry point: python -m rag.query "cheapest flights from JFK to LAX in July"

Embeds the question, retrieves the most relevant flight records from ChromaDB,
and passes them as context to the configured LLM backend.
"""
import logging
import sys

from rag.embedder import embed
from rag.llm_client import complete
from rag.vectorstore import retrieve

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
    "for the route. Do NOT name specific airports — refer to 'this route' instead. "
    "Reply in one sentence, 25 words max. No markdown, no bullet points. "
    "If records are insufficient, reply with exactly: insufficient data"
)


def query(question: str, n_results: int = 5, mode: str = "general") -> str:
    """
    Retrieve relevant flights and generate a grounded answer.

    mode: "general" for CLI use, "comparison" for the UI card (tighter output).
    """
    if not question.strip():
        return "Please provide a non-empty question."

    [question_embedding] = embed([question])
    context_docs = retrieve(question_embedding, n_results=n_results)

    if not context_docs:
        return "No relevant flight data found for that query."

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
