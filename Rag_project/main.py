"""main.py – Interactive RAG terminal Q&A loop."""
import sys, argparse
sys.path.insert(0, ".")
from src.config import config
from src.rag import run_rag_query, print_rag_result


def main():
    parser = argparse.ArgumentParser(description="RAG Terminal Q&A")
    parser.add_argument("--show-retrieval", action="store_true")
    parser.add_argument("--top-k", type=int, default=config.top_k)
    args = parser.parse_args()

    print("=" * 60)
    print("  RAG Q&A  |  Gemini + pgvector")
    print(f"  Model: {config.llm_model}  |  Top-K: {args.top_k}")
    print("  Type your question, or 'quit' to exit.")
    print("=" * 60)

    while True:
        try:
            print("\nQuestion:")
            question = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!"); break
        if not question:
            continue
        if question.lower() in {"quit", "exit", "q"}:
            print("Bye!"); break
        try:
            result = run_rag_query(question=question, top_k=args.top_k, show_retrieval=args.show_retrieval)
            print_rag_result(result)
        except Exception as exc:
            print(f"Error: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
