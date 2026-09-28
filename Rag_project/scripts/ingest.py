"""Ingest PDFs into the RAG knowledge base."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.database import (
    document_exists,
    insert_document,
    insert_chunks,
)

from src.pdf_loader import (
    load_all_pdfs,
    load_pdf,
    compute_file_hash,
)

from src.chunker import chunk_pages
from src.embeddings import embed_texts, validate_embedding_dimension


def ingest_document(filepath, file_hash, pages):
    """
    Ingest one already-loaded PDF into the RAG database.
    """

    filename = os.path.basename(filepath)
    title = os.path.splitext(filename)[0]

    print("  Chunking ...", end=" ", flush=True)

    chunks = chunk_pages(pages)

    print(f"OK ({len(chunks)} chunks)")

    if not chunks:
        return {
            "filename": filename,
            "status": "no_chunks",
            "chunks": 0,
        }

    print(
        f"  Generating embeddings for {len(chunks)} chunks ..."
    )

    embeddings = embed_texts(
        [c.text for c in chunks],
        task_type="RETRIEVAL_DOCUMENT",
        show_progress=True,
    )

    if embeddings:
        validate_embedding_dimension(embeddings[0])

    doc_id = insert_document(
        filename=filename,
        title=title,
        file_hash=file_hash,
    )

    print(
        f"  Inserted document record (id={doc_id})"
    )

    rows = [
        {
            "document_id": doc_id,
            "content": c.text,
            "chunk_index": c.chunk_index,
            "page_number": c.page_number,
            "embedding": emb,
        }
        for c, emb in zip(chunks, embeddings)
    ]

    print(
        f"  Inserting {len(rows)} chunks ...",
        end=" ",
        flush=True,
    )

    insert_chunks(rows)

    print("OK")

    return {
        "document_id": doc_id,
        "filename": filename,
        "status": "ingested",
        "pages": len(pages),
        "chunks": len(chunks),
    }


def ingest_single_pdf(filepath):
    """
    Ingest a single PDF file.

    This function is used by the FastAPI upload endpoint.
    """

    if not filepath.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are supported.")

    filename = os.path.basename(filepath)

    # Calculate SHA-256 hash
    file_hash = compute_file_hash(filepath)

    # Check whether this exact file already exists
    existing = document_exists(file_hash)

    if existing is not None:
        return {
            "document_id": existing,
            "filename": filename,
            "status": "already_exists",
            "chunks": 0,
        }

    # Extract page-aware text
    pages = load_pdf(filepath)

    # Run normal ingestion pipeline
    return ingest_document(
        filepath=filepath,
        file_hash=file_hash,
        pages=pages,
    )


def main():

    docs_dir = (
        sys.argv[1]
        if len(sys.argv) > 1
        else os.path.join(
            os.path.dirname(__file__),
            "..",
            "documents",
        )
    )

    docs_dir = os.path.abspath(docs_dir)

    print(
        f"RAG Ingestion | Documents: {docs_dir}"
    )

    try:
        pdf_files = load_all_pdfs(docs_dir)

    except FileNotFoundError as exc:

        print(
            f"Error: {exc}",
            file=sys.stderr,
        )

        sys.exit(1)

    if not pdf_files:

        print("Nothing to ingest.")

        sys.exit(0)

    summaries = []

    for filepath, file_hash, pages in pdf_files:

        fname = os.path.basename(filepath)

        print(f"\n-- {fname}")

        existing = document_exists(file_hash)

        if existing is not None:

            print(
                f"  Already ingested "
                f"(doc_id={existing}). Skipping."
            )

            summaries.append(
                {
                    "filename": fname,
                    "status": "skipped",
                    "chunks": 0,
                }
            )

            continue

        try:

            summaries.append(
                ingest_document(
                    filepath,
                    file_hash,
                    pages,
                )
            )

        except Exception as exc:

            print(
                f"  FAILED: {exc}",
                file=sys.stderr,
            )

            summaries.append(
                {
                    "filename": fname,
                    "status": "error",
                }
            )

    print("\n" + "=" * 60)

    print("Ingestion Summary")

    for s in summaries:

        icon = {
            "ingested": "[OK]",
            "skipped": "[SKIP]",
            "error": "[ERR]",
            "no_chunks": "[WARN]",
        }.get(
            s["status"],
            "?",
        )

        extra = (
            f"({s.get('chunks', 0)} chunks)"
            if s["status"] == "ingested"
            else ""
        )

        print(
            f"  {icon} "
            f"{s['filename']:45s} "
            f"{s['status']} "
            f"{extra}"
        )

    total_chunks = sum(
        s.get("chunks", 0)
        for s in summaries
    )

    print(
        f"\nTotal chunks stored: {total_chunks}"
    )

    print("Run: python main.py")


if __name__ == "__main__":
    main()