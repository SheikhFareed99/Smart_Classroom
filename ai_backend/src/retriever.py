from typing import List, Dict, Any
from groq import Groq
from src.config import GROQ_API_KEY, GROQ_MODEL
from src.embedder import Embedder
from src.vector_store import VectorStore


class Retriever:

    def __init__(self, embedder: Embedder = None, vector_store: VectorStore = None):
        self.embedder = embedder or Embedder()
        self.vector_store = vector_store or VectorStore()
        self.client = Groq(api_key=GROQ_API_KEY)

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        print(f"Searching: '{query}'")
        query_embedding = self.embedder.embed_query(query)
        results = self.vector_store.search(query_embedding, top_k=top_k)
        print(f"Found {len(results)} relevant chunks")
        return results

    def generate_answer(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        chunks = self.retrieve(query, top_k=top_k)

        if not chunks:
            return {
                "query": query,
                "answer": "I don't have enough information to answer that question.",
                "sources": [],
            }

        prompt = f"""Based on the following documents, please answer this question: {query}

CONTEXT:
"""
        for i, chunk in enumerate(chunks):
            prompt += f"\n--- Document {i + 1} (relevance: {chunk['score']:.3f}) ---\n"
            prompt += f"{chunk['text']}\n"

        prompt += """
Please provide a clear, comprehensive answer using the documents above.
If the documents don't contain enough information, say so.

ANSWER:"""

        try:
            response = self.client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=2048,
            )
            answer = response.choices[0].message.content
        except Exception as e:
            print(f"Answer generation failed: {e}")
            answer = "Sorry, I encountered an error generating the answer."

        return {
            "query": query,
            "answer": answer,
            "sources": [
                {"id": c["id"], "score": c["score"], "text": c["text"][:200]}
                for c in chunks
            ],
        }
