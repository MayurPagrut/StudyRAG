import json

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pathlib import Path
import shutil
import tempfile


from src.database import delete_document, get_cursor
from src.config import config
from src.rag import run_hybrid_query, stream_hybrid_query
from scripts.ingest import ingest_single_pdf

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5



app = FastAPI(
    title="Educational RAG API",
    version="1.0.0"
)


def require_service_auth(authorization: str | None = Header(default=None)):
    if not config.rag_require_service_auth:
        return
    if not config.rag_service_token:
        raise HTTPException(status_code=503, detail="RAG service authentication is not configured.")
    if authorization != f"Bearer {config.rag_service_token}":
        raise HTTPException(status_code=401, detail="RAG service authentication required.")


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.delete("/documents/{document_id}", status_code=204, dependencies=[Depends(require_service_auth)])
def delete_rag_document(document_id: int):

    deleted = delete_document(document_id)

    # Deleting an already-deleted document is considered successful.
    if not deleted:
        return

    return
@app.post("/query", dependencies=[Depends(require_service_auth)])
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
        result = run_hybrid_query(
            question=question,
            top_k=request.top_k,
        )

        return {
            "question": result["question"],
            "answer": result["answer"],
            "sources": result["sources"],
            "sourceMode": result["sourceMode"],
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"RAG query failed: {exc}"
        )


@app.post("/query/stream", dependencies=[Depends(require_service_auth)])
def query_rag_stream(request: QueryRequest):

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

    query_stream = stream_hybrid_query(question, top_k=request.top_k)

    def events():
        try:
            for event in query_stream:
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except GeneratorExit:
            return
        except Exception as exc:
            yield json.dumps({"type": "error", "message": str(exc)[:500]}, ensure_ascii=False) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")
    
@app.post("/documents", dependencies=[Depends(require_service_auth)])
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

@app.get("/documents", dependencies=[Depends(require_service_auth)])
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