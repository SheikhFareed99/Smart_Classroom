from typing import List, Dict, Any
from src.loader import DocumentLoader
from src.chunker import DocumentChunker
from src.summarizer import ContentSummarizer
from src.embedder import Embedder
from src.vector_store import VectorStore


class IngestionPipeline:

    def __init__(self):
        self.loader = DocumentLoader(data_dir=".")
        self.chunker = DocumentChunker()
        self.summarizer = ContentSummarizer()
        self.embedder = Embedder()
        self.vector_store = VectorStore()

    def ingest_directory(self, data_dir: str) -> Dict[str, Any]:
        print("Starting Ingestion Pipeline")
        print("=" * 50)

        self.loader.data_dir = data_dir
        elements = self.loader.load_all()

        if not elements:
            return {"status": "error", "message": "No elements extracted"}

        chunks_data = self.chunker.process_all(elements)
        chunks_data = self.summarizer.summarize_all(chunks_data)

        texts_to_embed = [c["enhanced_text"] for c in chunks_data]
        print(f"Generating embeddings for {len(texts_to_embed)} chunks...")
        embeddings = self.embedder.embed_documents(texts_to_embed)

        self.vector_store.upsert_documents(embeddings, chunks_data)

        stats = {
            "status": "success",
            "total_elements": len(elements),
            "total_chunks": len(chunks_data),
            "text_only": sum(1 for c in chunks_data if c["types"] == ["text"]),
            "with_tables": sum(1 for c in chunks_data if "table" in c["types"]),
            "with_images": sum(1 for c in chunks_data if "image" in c["types"]),
        }

        print("\nPipeline completed!")
        print(f"   Elements: {stats['total_elements']}")
        print(f"   Chunks:   {stats['total_chunks']}")
        print(f"   Tables:   {stats['with_tables']}")
        print(f"   Images:   {stats['with_images']}")
        return stats

    def ingest_file(self, file_path: str) -> Dict[str, Any]:
        print(f"Ingesting single file: {file_path}")
        print("=" * 50)

        elements = self.loader.load_single(file_path)

        if not elements:
            return {"status": "error", "message": "No elements extracted"}

        chunks_data = self.chunker.process_all(elements)
        chunks_data = self.summarizer.summarize_all(chunks_data)

        texts_to_embed = [c["enhanced_text"] for c in chunks_data]
        embeddings = self.embedder.embed_documents(texts_to_embed)

        self.vector_store.upsert_documents(embeddings, chunks_data)

        return {
            "status": "success",
            "file": file_path,
            "total_elements": len(elements),
            "total_chunks": len(chunks_data),
        }
