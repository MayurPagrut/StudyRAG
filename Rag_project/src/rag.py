"""RAG orchestration for the existing and hybrid query paths."""
from src.retriever import retrieve, format_retrieval_results
from src.generator import (
    generate_answer,
    generate_answer_stream,
    generate_general_answer,
    generate_general_answer_stream,
    generate_hybrid_answer,
    generate_hybrid_answer_stream,
    format_sources,
)
from src.config import config
from src.hybrid import route_question


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


def _structured_sources(chunks: list, mode: str, answer: str) -> list:
    if mode == "llm" or "answer could not be found in the provided documents" in answer.lower():
        return []
    return [
        {
            "document_id": chunk.document_id,
            "filename": chunk.filename,
            "page_number": chunk.page_number,
            "chunk_id": chunk.chunk_id,
            "similarity": chunk.similarity,
        }
        for chunk in chunks
    ]


def run_hybrid_query(question: str, top_k: int = None) -> dict:
    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")
    chunks = retrieve(question, top_k=top_k or config.top_k)
    decision = route_question(question, chunks)
    mode = decision["mode"]
    if mode == "rag":
        answer = generate_answer(question, chunks)
    elif mode == "llm":
        answer = generate_general_answer(question)
    else:
        answer = generate_hybrid_answer(question, chunks)
    return {
        "question": question,
        "answer": answer,
        "sourceMode": mode,
        "sources": _structured_sources(chunks, mode, answer),
        "chunks": chunks,
        "routing": decision,
    }


def stream_hybrid_query(question: str, top_k: int = None):
    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")
    chunks = retrieve(question, top_k=top_k or config.top_k)
    decision = route_question(question, chunks)
    mode = decision["mode"]
    yield {"type": "source_mode", "source_mode": mode}

    answer_parts = []
    if mode == "rag":
        answer_stream = generate_answer_stream(question, chunks)
    elif mode == "llm":
        answer_stream = generate_general_answer_stream(question)
    else:
        answer_stream = generate_hybrid_answer_stream(question, chunks)

    for text in answer_stream:
        answer_parts.append(text)
        yield {"type": "token", "text": text}

    answer = "".join(answer_parts)
    yield {"type": "sources", "sources": _structured_sources(chunks, mode, answer)}
    yield {"type": "done"}


def print_rag_result(result: dict) -> None:
    print("\n" + "=" * 60)
    print("ANSWER")
    print("=" * 60)
    print(result["answer"])
    if result["sources"]:
        print("\n" + "-" * 60)
        print(result["sources"])
    print("=" * 60)
