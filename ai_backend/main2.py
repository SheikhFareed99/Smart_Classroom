import sys
sys.path.insert(0, ".")

from src.loader import DocumentLoader
from src.chunker import DocumentChunker
from src.summarizer import ContentSummarizer
from src.embedder import Embedder
from src.vector_store import VectorStore
from src.retriever import Retriever


DOC_DIR = "./doc"


def main():
    print("=" * 60)
    print("  Smart Classroom RAG -- Terminal Mode")
    print("=" * 60)

    print("\nStep 1: Loading documents from ./doc ...")
    loader = DocumentLoader(data_dir=DOC_DIR)
    elements = loader.load_all()

    if not elements:
        print("No elements found. Add PDF/DOCX/PPTX files to the doc/ folder.")
        return

    print("\nStep 2: Chunking documents ...")
    chunker = DocumentChunker()
    chunks = chunker.process_all(elements)

    print("\nStep 3: Generating AI summaries for mixed content ...")
    summarizer = ContentSummarizer()
    chunks = summarizer.summarize_all(chunks)

    print("\nStep 4: Generating embeddings ...")
    embedder = Embedder()
    texts_to_embed = [c["enhanced_text"] for c in chunks]
    embeddings = embedder.embed_documents(texts_to_embed)

    print("\nStep 5: Storing in Pinecone ...")
    vector_store = VectorStore()
    vector_store.upsert_documents(embeddings, chunks)

    print("\n" + "=" * 60)
    print("  Documents ingested! Ask me anything.")
    print("  Type 'exit' to quit.")
    print("=" * 60)

    retriever = Retriever(embedder=embedder, vector_store=vector_store)

    while True:
        print()
        query = input("Your question: ").strip()

        if not query:
            continue
        if query.lower() == "exit":
            print("\nGoodbye!")
            break

        result = retriever.generate_answer(query)
        print(f"\nAnswer:\n{result['answer']}")
        print(f"\nSources ({len(result['sources'])} chunks used):")
        for s in result["sources"]:
            print(f"   [{s['id']}] score={s['score']:.3f}  {s['text'][:80]}...")


if __name__ == "__main__":
    main()
