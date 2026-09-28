"""tests/test_pipeline.py – Automated RAG pipeline test suite."""
import sys, os, traceback
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

results = []

def test(name, fn):
    print(f"\n-- {name}")
    try:
        fn()
        print("   PASS")
        results.append((name, "pass"))
    except AssertionError as e:
        print(f"   FAIL: {e}")
        results.append((name, "fail", str(e)))
    except Exception as e:
        print(f"   ERROR: {e}")
        traceback.print_exc()
        results.append((name, "error", str(e)))


def test_pdf_extraction():
    from src.pdf_loader import load_all_pdfs
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "documents"))
    if not any(f.endswith(".pdf") for f in os.listdir(docs_dir)):
        print("   SKIP: no PDFs in documents/"); return
    loaded = load_all_pdfs(docs_dir)
    assert loaded, "No PDFs loaded"
    _, fhash, pages = loaded[0]
    assert pages, "No pages extracted"
    assert pages[0].text.strip(), "Empty page text"
    assert len(fhash) == 64, "Hash must be 64-char SHA-256"
    print(f"   Loaded {len(loaded)} PDF(s), first has {len(pages)} pages")


def test_chunking():
    from src.pdf_loader import PageText
    from src.chunker import chunk_pages
    pages = [PageText("t.pdf", "/t.pdf", 1, ("Hello world sentence. " * 80))]
    chunks = chunk_pages(pages, chunk_size=100, chunk_overlap=20)
    assert chunks, "No chunks produced"
    for c in chunks:
        assert c.text.strip(), f"Chunk {c.chunk_index} is empty"
        assert c.page_number == 1
    print(f"   {len(chunks)} chunks from sample text")


def test_embeddings():
    from src.embeddings import embed_texts, embed_query, validate_embedding_dimension
    from src.config import config
    vecs = embed_texts(["Test sentence for embedding."])
    assert len(vecs) == 1
    assert len(vecs[0]) == config.embedding_dimension, f"Dim mismatch: {len(vecs[0])} != {config.embedding_dimension}"
    validate_embedding_dimension(vecs[0])
    qvec = embed_query("What is this?")
    assert len(qvec) == config.embedding_dimension
    print(f"   Embeddings OK (dim={config.embedding_dimension})")


def test_db_connection():
    from src.database import get_connection
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM chunks")
        count = cur.fetchone()[0]
    conn.close()
    assert count >= 0
    print(f"   Connected. Chunks in DB: {count}")


def test_retrieval():
    from src.database import get_connection
    from src.retriever import retrieve
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM chunks")
        count = cur.fetchone()[0]
    conn.close()
    if count == 0:
        print("   SKIP: no chunks -- run ingest first"); return
    chunks = retrieve("What is this document about?", top_k=3)
    assert isinstance(chunks, list)
    for c in chunks:
        assert 0.0 <= c.similarity <= 1.01, f"Similarity {c.similarity} out of range"
        assert c.filename and c.content.strip()
    print(f"   {len(chunks)} chunk(s) retrieved. Top similarity: {chunks[0].similarity:.4f}")


def test_no_hallucination():
    from src.generator import generate_answer
    answer = generate_answer("What is the airspeed of an unladen swallow in 1873?", chunks=[])
    assert "not found" in answer.lower() or "could not be found" in answer.lower(),         f"Expected refusal, got: {answer[:200]}"
    print(f"   Refusal: '{answer[:100]}...'")


def test_end_to_end():
    from src.database import get_connection
    from src.rag import run_rag_query
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM chunks")
        count = cur.fetchone()[0]
    conn.close()
    if count == 0:
        print("   SKIP: no chunks -- run ingest first"); return
    result = run_rag_query("What are the main topics in the documents?", top_k=5)
    assert result["answer"].strip(), "Empty answer"
    print(f"   Answer: {result['answer'][:150]}...")
    print(f"   Sources: {result['sources'][:100]}")


def main():
    print("=" * 60)
    print("RAG Pipeline Test Suite")
    print("=" * 60)
    test("1. PDF Extraction",          test_pdf_extraction)
    test("2. Chunking",                test_chunking)
    test("3. Embeddings (API call)",   test_embeddings)
    test("4. Database Connection",     test_db_connection)
    test("5. Vector Retrieval",        test_retrieval)
    test("6. No-Hallucination Refusal",test_no_hallucination)
    test("7. End-to-End RAG Query",    test_end_to_end)

    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r[1] == "pass")
    failed = sum(1 for r in results if r[1] in ("fail","error"))
    for r in results:
        icon = {"pass":"[PASS]","fail":"[FAIL]","error":"[ERR]"}.get(r[1],"[?]")
        print(f"  {icon}  {r[0]}")
    print(f"\n  Passed: {passed}  Failed: {failed}")
    print("=" * 60)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
