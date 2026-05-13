from pathlib import Path
import os
from dotenv import load_dotenv

# Load .env from repo root regardless of where the process is started from
load_dotenv(Path(__file__).parent.parent / ".env")

RAG_BACKEND: str = os.getenv("RAG_BACKEND", "ollama")  # "ollama" | "gemini"

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma4:e4b")

CHROMA_PATH: str = os.getenv("CHROMA_PATH", "data/chroma")
COLLECTION_NAME: str = os.getenv("COLLECTION_NAME", "flights")

EMBED_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
RETRIEVE_N: int = int(os.getenv("RETRIEVE_N", "5"))
