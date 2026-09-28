"""chunker.py – Token-aware, sentence-boundary-respecting chunker."""
import re
from dataclasses import dataclass
import tiktoken
from src.config import config
from src.pdf_loader import PageText

_ENC = tiktoken.get_encoding("cl100k_base")


@dataclass
class Chunk:
    filename:    str
    page_number: int
    chunk_index: int
    text:        str
    token_count: int


def _tok(text: str) -> list:
    return _ENC.encode(text)


def _dec(tokens: list) -> str:
    return _ENC.decode(tokens)


def _sentences(text: str) -> list:
    sentences = []
    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if para:
            for part in re.split(r"(?<=[.!?])\s+", para):
                part = part.strip()
                if part:
                    sentences.append(part)
    return sentences


def chunk_pages(pages: list, chunk_size: int = None, chunk_overlap: int = None) -> list:
    chunk_size    = chunk_size    or config.chunk_size
    chunk_overlap = chunk_overlap or config.chunk_overlap
    if chunk_overlap >= chunk_size:
        raise ValueError(f"chunk_overlap ({chunk_overlap}) must be < chunk_size ({chunk_size})")

    chunks, chunk_index = [], 0
    stream = []
    for page in pages:
        for s in _sentences(page.text):
            stream.append((s, page.page_number))
    if not stream:
        return []

    filename = pages[0].filename
    cur_tokens, cur_page = [], stream[0][1]

    def flush(tokens, page):
        nonlocal chunk_index
        text = _dec(tokens).strip()
        if text:
            chunks.append(Chunk(filename=filename, page_number=page,
                                chunk_index=chunk_index, text=text, token_count=len(tokens)))
            chunk_index += 1

    for sent, page in stream:
        s_tok = _tok(sent)
        if len(s_tok) > chunk_size:
            if cur_tokens:
                flush(cur_tokens, cur_page)
            for start in range(0, len(s_tok), chunk_size - chunk_overlap):
                flush(s_tok[start:start + chunk_size], page)
            cur_tokens, cur_page = [], page
            continue
        if len(cur_tokens) + len(s_tok) > chunk_size and cur_tokens:
            flush(cur_tokens, cur_page)
            cur_tokens = cur_tokens[-chunk_overlap:] if chunk_overlap > 0 else []
            cur_page = page
        cur_tokens.extend(s_tok)
        if len(cur_tokens) == len(s_tok):
            cur_page = page

    if cur_tokens:
        flush(cur_tokens, cur_page)
    return chunks
