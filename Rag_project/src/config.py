"""config.py – Central configuration loaded from .env."""
import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

_cwd_env = os.path.join(os.getcwd(), ".env")
_file_env = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))
load_dotenv(_cwd_env)
load_dotenv(_file_env)


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise EnvironmentError(
            f"Required environment variable '{key}' is not set. "
            f"Check your .env file."
        )
    return value


@dataclass
class Config:
    # ── Database (Supabase PostgreSQL) ───────────────────
    database_url:        str = field(default_factory=lambda: _require("DATABASE_URL"))

    # ── Google Gemini API ────────────────────────────────
    gemini_api_key:      str = field(default_factory=lambda: _require("GEMINI_API_KEY"))

    # ── Embedding Model (gemini-embedding-2, 768 dimensions)
    embedding_model:     str = field(default_factory=lambda: os.getenv("EMBEDDING_MODEL", "gemini-embedding-2"))
    embedding_dimension: int = field(default_factory=lambda: int(os.getenv("EMBEDDING_DIMENSION", "768")))

    # ── LLM Model (Currently available Gemini Flash) ─────
    llm_model:           str = field(default_factory=lambda: os.getenv("LLM_MODEL", "gemini-3.8-flash"))

    # ── Retrieval Settings ───────────────────────────────
    top_k:               int = field(default_factory=lambda: int(os.getenv("TOP_K", "5")))
    hybrid_rag_strong_threshold: float = field(default_factory=lambda: float(os.getenv("HYBRID_RAG_STRONG_THRESHOLD", "0.70")))
    hybrid_rag_weak_threshold:   float = field(default_factory=lambda: float(os.getenv("HYBRID_RAG_WEAK_THRESHOLD", "0.52")))
    hybrid_min_relevant_chunks:  int = field(default_factory=lambda: int(os.getenv("HYBRID_MIN_RELEVANT_CHUNKS", "1")))
    hybrid_min_context_coverage: float = field(default_factory=lambda: float(os.getenv("HYBRID_MIN_CONTEXT_COVERAGE", "0.20")))

    # ── Chunking Settings ────────────────────────────────
    chunk_size:          int = field(default_factory=lambda: int(os.getenv("CHUNK_SIZE", "600")))
    chunk_overlap:       int = field(default_factory=lambda: int(os.getenv("CHUNK_OVERLAP", "75")))


config = Config()
