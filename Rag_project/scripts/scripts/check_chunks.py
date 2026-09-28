import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import get_cursor

document_id = int(sys.argv[1]) if len(sys.argv) > 1 else 2

with get_cursor() as cur:
    cur.execute(
        """
        SELECT COUNT(*) AS count
        FROM chunks
        WHERE document_id = %s
        """,
        (document_id,)
    )

    print(cur.fetchone())