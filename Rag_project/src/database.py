"""database.py – PostgreSQL (Supabase) connection, schema, and vector search."""
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from typing import Optional
from src.config import config


def get_connection():
    try:
        return psycopg2.connect(config.database_url)
    except psycopg2.OperationalError as exc:
        raise ConnectionError(
            f"Cannot connect to Supabase PostgreSQL using DATABASE_URL.\n"
            f"Check your DATABASE_URL in .env.\nError: {exc}"
        ) from exc


@contextmanager
def get_cursor(conn=None):
    own = conn is None
    if own:
        conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        if own:
            conn.close()


SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id         SERIAL PRIMARY KEY,
    filename   TEXT        NOT NULL,
    title      TEXT,
    file_type  TEXT        NOT NULL DEFAULT 'pdf',
    file_hash  TEXT        NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER     NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content     TEXT        NOT NULL,
    chunk_index INTEGER     NOT NULL,
    page_number INTEGER,
    embedding   vector({dim}),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
    ON chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);
"""


def setup_database():
    schema = SCHEMA_SQL.format(dim=config.embedding_dimension)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(schema)
        conn.commit()
        print(f"Database schema ready on Supabase (vector dim={config.embedding_dimension})")
    except Exception as exc:
        conn.rollback()
        raise RuntimeError(f"Schema setup failed: {exc}") from exc
    finally:
        conn.close()


def document_exists(file_hash: str) -> Optional[int]:
    with get_cursor() as cur:
        cur.execute("SELECT id FROM documents WHERE file_hash = %s", (file_hash,))
        row = cur.fetchone()
        return row["id"] if row else None


def insert_document(filename: str, title: str, file_hash: str) -> int:
    with get_cursor() as cur:
        cur.execute(
            "INSERT INTO documents (filename, title, file_type, file_hash) VALUES (%s, %s, 'pdf', %s) RETURNING id",
            (filename, title, file_hash),
        )
        return cur.fetchone()["id"]


def insert_chunks(rows: list) -> None:
    if not rows:
        return
    from pgvector.psycopg2 import register_vector
    conn = get_connection()
    register_vector(conn)
    try:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(
                cur,
                "INSERT INTO chunks (document_id, content, chunk_index, page_number, embedding) "
                "VALUES (%(document_id)s, %(content)s, %(chunk_index)s, %(page_number)s, %(embedding)s)",
                rows, page_size=100,
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def search_similar_chunks(query_embedding: list, top_k: int) -> list:
    from pgvector.psycopg2 import register_vector
    conn = get_connection()
    register_vector(conn)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """SELECT c.id, c.document_id, c.content, c.chunk_index, c.page_number,
                          d.filename, 1 - (c.embedding <=> %s::vector) AS similarity
                   FROM chunks c JOIN documents d ON d.id = c.document_id
                   ORDER BY c.embedding <=> %s::vector LIMIT %s""",
                (query_embedding, query_embedding, top_k),
            )
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

def delete_document(document_id: int) -> bool:
    """
    Delete a document and all of its chunks/embeddings.

    Because chunks.document_id uses ON DELETE CASCADE,
    deleting the document automatically removes its chunks.
    
    Returns:
        True  -> document existed and was deleted
        False -> document did not exist
    """
    with get_cursor() as cur:
        cur.execute(
            "DELETE FROM documents WHERE id = %s RETURNING id",
            (document_id,)
        )
        row = cur.fetchone()
        return row is not None