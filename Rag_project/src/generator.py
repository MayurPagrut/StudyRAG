"""generator.py – Strictly-grounded Gemini LLM answer generation."""
import google.generativeai as genai
from src.config import config
from src.retriever import RetrievedChunk

genai.configure(api_key=config.gemini_api_key)

_SYSTEM = (
    "You are a precise document assistant. Answer ONLY from the context passages provided. "
    "Rules: (1) Use only provided context. No outside knowledge. "
    "(2) If context lacks the answer, respond exactly: "
    "\'The answer could not be found in the provided documents.\' "
    "(3) Cite sources as [Source: <filename>, page <N>] at the end. "
    "(4) Never invent facts, dates, numbers, or names not in the context."
)


def _context_block(chunks: list) -> str:
    parts = []
    for c in chunks:
        parts.append(f"--- Passage {c.rank} [Source: {c.filename}, page {c.page_number}] ---\n{c.content}")
    return "\n\n".join(parts)


def generate_answer(question: str, chunks: list) -> str:
    if not chunks:
        return ("The answer could not be found in the provided documents.\n"
                "(No relevant content was retrieved from the knowledge base.)")
    prompt = (
        f"CONTEXT PASSAGES:\n{_context_block(chunks)}\n\n---\n"
        f"QUESTION: {question}\n\n"
        "Answer based strictly on the context. If the answer is not present, say "
        "\'The answer could not be found in the provided documents.\'"
    )
    try:
        model = genai.GenerativeModel(model_name=config.llm_model, system_instruction=_SYSTEM)
        resp  = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.0, max_output_tokens=1024),
        )
        return resp.text.strip()
    except Exception as exc:
        raise RuntimeError(f"LLM API failed: {exc}\nCheck GEMINI_API_KEY and LLM_MODEL in .env.") from exc


def format_sources(chunks: list) -> str:
    if not chunks:
        return ""
    seen, lines = set(), ["Sources:"]
    for c in chunks:
        key = (c.filename, c.page_number)
        if key not in seen:
            seen.add(key)
            lines.append(f"  * {c.filename} -- page {c.page_number}")
    return "\n".join(lines)
