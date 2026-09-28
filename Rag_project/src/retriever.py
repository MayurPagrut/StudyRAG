"""retriever.py – Vector similarity search returning typed RetrievedChunk objects."""
from dataclasses import dataclass
from src.config import config
from src.database import search_similar_chunks
from src.embeddings import embed_query


@dataclass
class RetrievedChunk:
    rank:        int
    similarity:  float
    filename:    str
    page_number: int
    chunk_index: int
    content:     str
    document_id: int
    chunk_id:    int


def retrieve(question: str, top_k: int = None) -> list:
    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")
    top_k = top_k or config.top_k
    vec   = embed_query(question)
    rows  = search_similar_chunks(vec, top_k)
    return [
        RetrievedChunk(rank=i + 1, similarity=float(r["similarity"]),
                       filename=r["filename"], page_number=r["page_number"],
                       chunk_index=r["chunk_index"], content=r["content"],
                       document_id=r["document_id"], chunk_id=r["id"])
        for i, r in enumerate(rows)
    ]


def format_retrieval_results(chunks: list) -> str:
    if not chunks:
        return "No relevant chunks found."
    lines = ["Retrieval Results:", "-" * 60]
    for c in chunks:
        lines.append(f"[{c.rank}] similarity={c.similarity:.4f}  "
                     f"source={c.filename}  page={c.page_number}  chunk={c.chunk_index}")
        lines.append(f"    {c.content[:200].replace(chr(10),' ')}...")
    lines.append("-" * 60)
    return "\n".join(lines)
