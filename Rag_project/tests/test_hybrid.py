"""Deterministic hybrid-router tests that do not call Gemini or PostgreSQL."""
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.hybrid import route_question


def chunk(similarity: float, content: str):
    return SimpleNamespace(similarity=similarity, content=content)


def test_strong_document_evidence_is_rag():
    decision = route_question(
        "What are the ACID properties in database systems?",
        [chunk(0.75, "Database systems use atomicity, consistency, isolation, and durability (ACID).")],
    )
    assert decision["mode"] == "rag"


def test_weak_document_evidence_is_llm():
    decision = route_question(
        "What is the capital of Japan?",
        [chunk(0.49, "A chemistry document discusses atoms and molecules.")],
    )
    assert decision["mode"] == "llm"


def test_relevant_broader_question_is_hybrid():
    decision = route_question(
        "Compare machine learning systems with modern deployment practices and provide additional context.",
        [chunk(0.72, "Machine learning systems use training data and evaluation metrics.")],
    )
    assert decision["mode"] == "hybrid"


if __name__ == "__main__":
    tests = [
        test_strong_document_evidence_is_rag,
        test_weak_document_evidence_is_llm,
        test_relevant_broader_question_is_hybrid,
    ]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
