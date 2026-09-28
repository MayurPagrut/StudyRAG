"""scripts/setup_db.py – Create schema and enable pgvector on Supabase."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from src.config import config
from src.database import setup_database, get_connection


def main():
    print("── RAG Database Setup (Supabase PostgreSQL) ──────────────────")
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            ver = cur.fetchone()
            print("✓ Connected to Supabase PostgreSQL:")
            print(f"  {ver['version'] if isinstance(ver, dict) else ver[0]}")
        conn.close()
    except Exception as exc:
        print(f"✗ Connection to Supabase failed: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        setup_database()
    except Exception as exc:
        print(f"✗ Schema setup failed: {exc}", file=sys.stderr)
        sys.exit(1)

    print("\n✅ Database is ready! Next step: run python scripts/ingest.py")


if __name__ == "__main__":
    main()
