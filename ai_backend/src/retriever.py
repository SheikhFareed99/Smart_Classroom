import re
from typing import List, Dict, Any
from collections import defaultdict
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder
from groq import Groq
from src.config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    RERANKER_MODEL,
    KEYWORD_WEIGHT,
    SEMANTIC_WEIGHT,
    RRF_K,
    RETRIEVER_INITIAL_TOP_K,
    RERANKER_TOP_K,
    BM25_MAX_CHUNKS,
)
from src.embedder import Embedder
from src.vector_store import VectorStore


SYSTEM_PROMPT = """You are an expert academic assistant for the Smart Classroom platform.
Your role is to provide accurate, well-structured, and comprehensive answers based ONLY on the provided context documents.

Rules you MUST follow:
1. Answer ONLY from the provided context. If the context does not contain the answer, say so clearly.
2. Structure your response with clear headings, bullet points, or numbered lists when appropriate.
3. Use plain, clean text. Never include raw escape characters, code comment syntax, or formatting artifacts in your answer.
4. Be precise with facts, numbers, and definitions from the source material.
5. When multiple documents discuss the same topic, synthesize the information into a single coherent answer.
6. If the question is ambiguous, address the most likely interpretation and note the ambiguity.
7. Keep your language professional, concise, and easy to understand."""


def _tokenize(text: str) -> List[str]:
    return re.findall(r"\w+", text.lower())


def _clean_answer(text: str) -> str:
    text = text.replace("\\n", "\n")
    text = text.replace("\\t", " ")
    text = text.replace("\\r", "")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    text = text.replace("/*", "").replace("*/", "")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class Retriever:

    def __init__(self, embedder: Embedder = None, vector_store: VectorStore = None):
        self.embedder = embedder or Embedder()
        self.vector_store = vector_store or VectorStore()
        self.client = Groq(api_key=GROQ_API_KEY)
        print(f"Loading cross-encoder reranker: {RERANKER_MODEL}")
        self.reranker = CrossEncoder(RERANKER_MODEL)
        print("Reranker ready")

    def _semantic_search(
        self, query: str, top_k: int, namespace: str
    ) -> List[Dict[str, Any]]:
        query_embedding = self.embedder.embed_query(query)
        results = self.vector_store.search(
            query_embedding, top_k=top_k, namespace=namespace
        )
        return results

    def _keyword_search(
        self, query: str, top_k: int, namespace: str
    ) -> List[Dict[str, Any]]:
        doc_count = self.vector_store.count_documents(namespace=namespace)
        if doc_count > BM25_MAX_CHUNKS:
            print(f"  Skipping BM25: {doc_count} chunks exceeds limit of {BM25_MAX_CHUNKS}")
            return []

        all_docs = self.vector_store.fetch_all_texts(namespace=namespace)
        if not all_docs:
            return []

        corpus_tokens = [_tokenize(doc["text"]) for doc in all_docs]
        bm25 = BM25Okapi(corpus_tokens)
        query_tokens = _tokenize(query)
        scores = bm25.get_scores(query_tokens)

        scored_docs = []
        for i, doc in enumerate(all_docs):
            scored_docs.append({
                "id": doc["id"],
                "score": float(scores[i]),
                "text": doc["text"],
                "raw_text": doc.get("raw_text", doc["text"]),
                "has_tables": False,
                "has_images": False,
            })

        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        return scored_docs[:top_k]

    def _reciprocal_rank_fusion(
        self,
        semantic_results: List[Dict[str, Any]],
        keyword_results: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        rrf_scores: Dict[str, float] = defaultdict(float)
        doc_map: Dict[str, Dict[str, Any]] = {}

        for rank, doc in enumerate(semantic_results, start=1):
            doc_id = doc["id"]
            rrf_scores[doc_id] += SEMANTIC_WEIGHT / (RRF_K + rank)
            doc_map[doc_id] = doc

        for rank, doc in enumerate(keyword_results, start=1):
            doc_id = doc["id"]
            rrf_scores[doc_id] += KEYWORD_WEIGHT / (RRF_K + rank)
            if doc_id not in doc_map:
                doc_map[doc_id] = doc

        fused = []
        for doc_id, score in sorted(
            rrf_scores.items(), key=lambda x: x[1], reverse=True
        ):
            entry = doc_map[doc_id].copy()
            entry["rrf_score"] = score
            fused.append(entry)

        return fused

    def _rerank(
        self, query: str, candidates: List[Dict[str, Any]], top_k: int
    ) -> List[Dict[str, Any]]:
        if not candidates:
            return []

        pairs = [(query, doc["text"]) for doc in candidates]
        scores = self.reranker.predict(pairs)

        for i, doc in enumerate(candidates):
            doc["rerank_score"] = float(scores[i])

        candidates.sort(key=lambda x: x["rerank_score"], reverse=True)
        return candidates[:top_k]

    def retrieve(
        self, query: str, top_k: int = RERANKER_TOP_K, namespace: str = ""
    ) -> List[Dict[str, Any]]:
        print(f"Hybrid search: '{query}' in namespace='{namespace}'")

        initial_k = RETRIEVER_INITIAL_TOP_K
        doc_count = self.vector_store.count_documents(namespace=namespace)
        bm25_skipped = doc_count > BM25_MAX_CHUNKS

        semantic_k = initial_k * 2 if bm25_skipped else initial_k
        print(f"  Semantic search (top {semantic_k})...")
        semantic_results = self._semantic_search(query, semantic_k, namespace)
        print(f"  Found {len(semantic_results)} semantic results")

        print(f"  Keyword search (BM25, top {initial_k})...")
        keyword_results = self._keyword_search(query, initial_k, namespace)
        print(f"  Found {len(keyword_results)} keyword results")

        print("  Applying Reciprocal Rank Fusion...")
        fused = self._reciprocal_rank_fusion(semantic_results, keyword_results)
        print(f"  Fused into {len(fused)} unique candidates")

        print(f"  Re-ranking with cross-encoder (top {top_k})...")
        reranked = self._rerank(query, fused, top_k)
        print(f"  Final {len(reranked)} chunks selected")

        return reranked

    def generate_answer(
        self, query: str, top_k: int = RERANKER_TOP_K, namespace: str = ""
    ) -> Dict[str, Any]:
        chunks = self.retrieve(query, top_k=top_k, namespace=namespace)

        if not chunks:
            return {
                "query": query,
                "answer": "I don't have enough information to answer that question.",
                "sources": [],
            }

        context = ""
        for i, chunk in enumerate(chunks):
            score_label = chunk.get("rerank_score", chunk.get("rrf_score", 0))
            context += f"\n--- Document {i + 1} (relevance: {score_label:.3f}) ---\n"
            context += f"{chunk['text']}\n"

        user_message = f"""Based on the following documents, answer the question below.

CONTEXT:
{context}

QUESTION: {query}

Provide a clear, well-structured answer using the documents above. Use headings, bullet points, or numbered lists to organize your answer when appropriate."""

        try:
            response = self.client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0,
                max_tokens=2048,
            )
            answer = _clean_answer(response.choices[0].message.content)
        except Exception as e:
            print(f"Answer generation failed: {e}")
            answer = "Sorry, I encountered an error generating the answer."

        return {
            "query": query,
            "answer": answer,
            "sources": [
                {
                    "id": c["id"],
                    "score": round(c.get("rerank_score", c.get("rrf_score", 0)), 4),
                    "text": c["text"][:200],
                }
                for c in chunks
            ],
        }
