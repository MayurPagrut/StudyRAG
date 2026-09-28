from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from pathlib import Path
import shutil
import tempfile


from src.database import delete_document, get_cursor
from src.rag import run_rag_query
from scripts.ingest import ingest_single_pdf

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5



app = FastAPI(
    title="Educational RAG API",
    version="1.0.0"
)


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.delete("/documents/{document_id}", status_code=204)
def delete_rag_document(document_id: int):

    deleted = delete_document(document_id)

    # Deleting an already-deleted document is considered successful.
    if not deleted:
        return

    return
@app.post("/query")
def query_rag(request: QueryRequest):

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    if request.top_k < 1 or request.top_k > 20:
        raise HTTPException(
            status_code=400,
            detail="top_k must be between 1 and 20."
        )

    try:
        result = run_rag_query(
            question=question,
            top_k=request.top_k,
            show_retrieval=False
        )

        answer = result["answer"]
        not_found = "answer could not be found in the provided documents" in answer.lower()
        sources = [] if not_found else [
            {
                "document_id": chunk.document_id,
                "filename": chunk.filename,
                "page_number": chunk.page_number,
                "chunk_id": chunk.chunk_id,
                "similarity": chunk.similarity,
            }
            for chunk in result["chunks"]
        ]

        return {
            "question": result["question"],
            "answer": answer,
            "sources": sources
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"RAG query failed: {exc}"
        )
    
@app.post("/documents")
def upload_document(file: UploadFile = File(...)):

    # Only PDFs
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    # Create temporary file
    temp_dir = Path(tempfile.mkdtemp())

    temp_path = temp_dir / file.filename

    try:

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        # Run your existing RAG ingestion pipeline
        result = ingest_single_pdf(
            str(temp_path)
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Ingestion failed: {exc}"
        )

    finally:

        # Remove temporary uploaded file
        shutil.rmtree(
            temp_dir,
            ignore_errors=True
        )

@app.get("/documents")
def list_documents():

    with get_cursor() as cur:
        cur.execute("""
            SELECT
                d.id,
                d.filename,
                d.title,
                d.created_at,
                COUNT(c.id) AS chunk_count
            FROM documents d
            LEFT JOIN chunks c
                ON c.document_id = d.id
            GROUP BY d.id
            ORDER BY d.created_at DESC
        """)

        rows = cur.fetchall()

    return {
        "documents": [dict(row) for row in rows]
    }        