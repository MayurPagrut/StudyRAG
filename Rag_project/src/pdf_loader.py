"""pdf_loader.py – Extract page-aware text from PDF files using pdfplumber."""
import os
import hashlib
from dataclasses import dataclass
import pdfplumber


@dataclass
class PageText:
    filename:    str
    filepath:    str
    page_number: int
    text:        str


def _clean(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return "\n".join(line.strip() for line in text.split("\n")).strip()


def compute_file_hash(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


def load_pdf(filepath: str) -> list:
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"PDF not found: {filepath}")
    filename = os.path.basename(filepath)
    pages = []
    try:
        with pdfplumber.open(filepath) as pdf:
            if not pdf.pages:
                raise ValueError(f"PDF has no pages: {filepath}")
            for num, page in enumerate(pdf.pages, 1):
                text = _clean(page.extract_text() or "")
                if text:
                    pages.append(PageText(filename=filename, filepath=filepath, page_number=num, text=text))
    except Exception as exc:
        if isinstance(exc, (FileNotFoundError, ValueError)):
            raise
        raise ValueError(f"Failed to read PDF '{filepath}': {exc}") from exc
    if not pages:
        raise ValueError(f"PDF '{filepath}' has no extractable text (may be image-only/scanned).")
    return pages


def load_all_pdfs(documents_dir: str) -> list:
    import sys
    if not os.path.isdir(documents_dir):
        raise FileNotFoundError(f"Documents directory not found: {documents_dir}")
    pdf_files = sorted(f for f in os.listdir(documents_dir) if f.lower().endswith(".pdf"))
    if not pdf_files:
        print(f"No PDF files found in '{documents_dir}'")
        return []
    results = []
    for filename in pdf_files:
        filepath = os.path.join(documents_dir, filename)
        print(f"  Loading: {filename} ...", end=" ", flush=True)
        try:
            fhash = compute_file_hash(filepath)
            pages = load_pdf(filepath)
            print(f"OK ({len(pages)} pages with text)")
            results.append((filepath, fhash, pages))
        except (ValueError, FileNotFoundError) as exc:
            print(f"SKIPPED: {exc}", file=sys.stderr)
    return results
