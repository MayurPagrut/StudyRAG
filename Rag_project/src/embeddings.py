"""embeddings.py – Gemini embedding wrapper with batching and dimension control."""
import time
import google.generativeai as genai
from src.config import config

genai.configure(api_key=config.gemini_api_key)

_BATCH_SIZE  = 100
_BATCH_DELAY = 1.0


def _normalize_model_name(name: str) -> str:
    if not name.startswith("models/"):
        return f"models/{name}"
    return name


def _extract_1d_vector(raw) -> list:
    """
    Extract and guarantee a strictly 1-D list of floats: [float, float, ...].
    Recursively unwraps any nested lists or dicts returned by the Gemini API.
    """
    vec = raw
    if isinstance(vec, dict) and "embedding" in vec:
        vec = vec["embedding"]
    while isinstance(vec, list) and len(vec) > 0 and isinstance(vec[0], list):
        vec = vec[0]
    if not isinstance(vec, list) or not vec or not isinstance(vec[0], (float, int)):
        raise ValueError(f"Expected a 1-D list of numbers, got {type(vec)} with element {type(vec[0]) if vec else 'empty'}")
    return [float(x) for x in vec]


def _embed_batch(texts: list, task_type: str = "RETRIEVAL_DOCUMENT") -> list:
    """Embed a batch of document texts. Returns list of 1-D float vectors."""
    try:
        model_name = _normalize_model_name(config.embedding_model)
        result = genai.embed_content(
            model=model_name,
            content=texts,
            task_type=task_type,
            output_dimensionality=config.embedding_dimension,
        )
        raw = result["embedding"]
        if raw and isinstance(raw[0], (float, int)):
            return [_extract_1d_vector(raw)]
        return [_extract_1d_vector(item) for item in raw]
    except Exception as exc:
        raise RuntimeError(f"Embedding API failed: {exc}\nCheck GEMINI_API_KEY and EMBEDDING_MODEL in .env.") from exc


def embed_texts(texts: list, task_type: str = "RETRIEVAL_DOCUMENT", show_progress: bool = False) -> list:
    """Embed multiple document texts in batches. Returns list[list[float]] of 1-D vectors."""
    if not texts:
        return []
    all_emb = []
    total   = (len(texts) + _BATCH_SIZE - 1) // _BATCH_SIZE
    for i, start in enumerate(range(0, len(texts), _BATCH_SIZE), 1):
        batch = texts[start:start + _BATCH_SIZE]
        if show_progress:
            print(f"  Embedding batch {i}/{total} ({len(batch)} texts) ...", end=" ", flush=True)
        embs = _embed_batch(batch, task_type=task_type)
        all_emb.extend(embs)
        if show_progress:
            print("OK")
        if start + _BATCH_SIZE < len(texts):
            time.sleep(_BATCH_DELAY)
    return all_emb


def embed_query(question: str) -> list:
    """
    Embed a single user question for vector similarity search.
    Guarantees:
      - type: list
      - length: 768
      - type of v[0]: float
    """
    if not question or not question.strip():
        raise ValueError("Cannot embed an empty question.")
    try:
        model_name = _normalize_model_name(config.embedding_model)
        result = genai.embed_content(
            model=model_name,
            content=question.strip(),
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=config.embedding_dimension,
        )
        vec = _extract_1d_vector(result["embedding"])
        validate_embedding_dimension(vec)
        return vec
    except Exception as exc:
        raise RuntimeError(f"Query embedding API failed: {exc}\nCheck GEMINI_API_KEY in .env.") from exc


def validate_embedding_dimension(embedding: list) -> None:
    actual, expected = len(embedding), config.embedding_dimension
    if actual != expected:
        raise ValueError(f"Embedding dimension mismatch: got {actual}, expected {expected}.")
