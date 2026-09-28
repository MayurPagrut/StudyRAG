"""rag.py – Orchestrates retrieve -> generate into a single run_rag_query() call."""
from src.retriever import retrieve, format_retrieval_results
from src.generator import generate_answer, format_sources
from src.config import config


def run_rag_query(question: str, top_k: int = None, show_retrieval: bool = False) -> dict:
    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")
    top_k  = top_k or config.top_k
    chunks = retrieve(question, top_k=top_k)
    if show_retrieval:
        print(format_retrieval_results(chunks))
    answer  = generate_answer(question, chunks)
    sources = format_sources(chunks)
    return {"question": question, "answer": answer, "sources": sources, "chunks": chunks}


def print_rag_result(result: dict) -> None:
    print("\n" + "=" * 60)
    print("ANSWER")
    print("=" * 60)
    print(result["answer"])
    if result["sources"]:
        print("\n" + "-" * 60)
        print(result["sources"])
    print("=" * 60)
