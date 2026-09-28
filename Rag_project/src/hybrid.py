"""Deterministic routing between uploaded-document RAG and general Gemini knowledge."""
import re
from typing import Literal

from src.config import config

SourceMode = Literal["rag", "llm", "hybrid"]

_STOP_WORDS = {
    "a", "an", "and", "are", "be", "by", "can", "could", "do", "does", "each", "explain",
    "for", "from", "how", "in", "is", "it", "of", "on", "or", "should", "tell", "the",
    "their", "this", "to", "was", "what", "when", "where", "which", "who", "why", "with",
    "would",
}
_BROADER_TERMS = {
    "additional", "beyond", "compare", "comparison", "contrast", "current", "difference",
    "different", "modern", "outside", "versus", "vs", "wider",
}


def _terms(text: str) -> set[str]:
    return {
        term for term in re.findall(r"[a-z0-9]+", text.lower())
        if len(term) > 2 and term not in _STOP_WORDS
    }


def _coverage(question: str, chunks: list) -> float:
    question_terms = _terms(question)
    if not question_terms:
        return 0.0
    context_terms = _terms(" ".join(chunk.content for chunk in chunks))
    return len(question_terms & context_terms) / len(question_terms)


def route_question(question: str, chunks: list) -> dict:
    """Classify retrieval evidence without making an additional model call."""
    if not chunks:
        return {"mode": "llm", "reason": "No document chunks were retrieved.", "confidence": 1.0, "chunks": chunks}

    scores = [float(chunk.similarity) for chunk in chunks]
    top_similarity = max(scores)
    average_similarity = sum(scores) / len(scores)
    relevant_chunks = [chunk for chunk in chunks if chunk.similarity >= config.hybrid_rag_weak_threshold]
    strong_chunks = [chunk for chunk in chunks if chunk.similarity >= config.hybrid_rag_strong_threshold]
    context_coverage = _coverage(question, relevant_chunks)
    broader_request = bool(_terms(question) & _BROADER_TERMS)

    if (
        top_similarity < config.hybrid_rag_weak_threshold
        or not relevant_chunks
        or context_coverage < config.hybrid_min_context_coverage
    ):
        mode: SourceMode = "llm"
        reason = "Retrieved document evidence is weak, unrelated, or lacks meaningful question coverage."
        confidence = max(0.0, min(1.0, (config.hybrid_rag_weak_threshold - top_similarity) / 0.20))
    elif (
        top_similarity >= config.hybrid_rag_strong_threshold
        and len(strong_chunks) >= config.hybrid_min_relevant_chunks
        and context_coverage >= config.hybrid_min_context_coverage
        and not broader_request
    ):
        mode = "rag"
        reason = "Strong retrieved evidence covers the question without a broader-context request."
        confidence = max(0.0, min(1.0, (top_similarity - config.hybrid_rag_strong_threshold) / 0.20))
    else:
        mode = "hybrid"
        reason = "Retrieved evidence is meaningful but incomplete or broader context was requested."
        confidence = max(0.0, min(1.0, context_coverage))

    return {
        "mode": mode,
        "reason": reason,
        "confidence": round(confidence, 3),
        "chunks": chunks,
        "top_similarity": top_similarity,
        "average_similarity": average_similarity,
        "relevant_chunk_count": len(relevant_chunks),
        "context_coverage": round(context_coverage, 3),
    }