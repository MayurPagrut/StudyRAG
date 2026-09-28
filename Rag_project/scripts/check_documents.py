import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import get_cursor


with get_cursor() as cur:

    if len(sys.argv) == 1:
        # List all documents
        cur.execute("""
            SELECT id, filename, title, file_hash, created_at
            FROM documents
            ORDER BY id
        """)

        rows = cur.fetchall()

        if not rows:
            print("No documents found.")
        else:
            for row in rows:
                print(row)

    elif len(sys.argv) == 2:
        # Check one document and its chunk count
        document_id = int(sys.argv[1])

        cur.execute(
            """
            SELECT
                d.id,
                d.filename,
                COUNT(c.id) AS chunk_count
            FROM documents d
            LEFT JOIN chunks c
                ON c.document_id = d.id
            WHERE d.id = %s
            GROUP BY d.id, d.filename
            """,
            (document_id,)
        )

        row = cur.fetchone()

        if not row:
            print(f"Document {document_id} not found.")
        else:
            print(row)

    else:
        print("Usage:")
        print("  python scripts/check_documents.py")
        print("  python scripts/check_documents.py <document_id>")