import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import delete_document


if len(sys.argv) != 2:
    print("Usage: python scripts/delete_document.py <document_id>")
    sys.exit(1)

document_id = int(sys.argv[1])

print(f"Deleting document ID {document_id}...")

deleted = delete_document(document_id)

if deleted:
    print(f"SUCCESS: Document {document_id} deleted.")
    print("Its associated chunks should have been deleted automatically.")
else:
    print(f"Document {document_id} was not found.")