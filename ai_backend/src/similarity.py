import os
import tempfile
import shutil
import numpy as np
import requests as http_requests

from pathlib import Path
from urllib.parse import urlparse
from typing import List, Dict, Any

from pinecone import Pinecone
from src.loader import DocumentLoader
from src.embedder import Embedder
from src.config import (
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    SIMILARITY_THRESHOLD,
    SUPPORTED_EXTENSIONS,
)


class SimilarityChecker:

    def __init__(self):
        print("Initializing SimilarityChecker...")
        self.loader = DocumentLoader()
        self.embedder = Embedder()
        self.pc = Pinecone(api_key=PINECONE_API_KEY)
        self.index = self.pc.Index(PINECONE_INDEX_NAME)
        print("SimilarityChecker ready")

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _namespace_for(self, deliverable_id: str) -> str:
        """Pinecone namespace that isolates each assignment's embeddings."""
        return f"plag_{deliverable_id}"

    def _download_url(self, url: str, dest_path: str):
        """Download a remote file (Azure SAS URL) to a local path."""
        r = http_requests.get(url, timeout=120)
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            f.write(r.content)

    def _extract_text(self, file_path: str) -> str:
        elements = self.loader.load_single(file_path)
        parts = [el["content"] for el in elements if el.get("content")]
        return "\n\n".join(parts)

    def _cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        a = np.array(vec_a)
        b = np.array(vec_b)
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))

    # ── Step 1: Called at submission time ─────────────────────────────────────

    def embed_and_store(
        self,
        file_url: str,
        deliverable_id: str,
        student_id: str,
        student_name: str,
    ) -> Dict[str, Any]:
        """
        Download student submission, extract text, embed it, and store the
        single vector in Pinecone under namespace plag_{deliverable_id}.

        Uses student_id as the vector ID so re-submissions overwrite the old vector.
        """
        print(f"[embed_and_store] student={student_id} deliverable={deliverable_id}")
        namespace = self._namespace_for(deliverable_id)

        # Determine file extension
        parsed = urlparse(file_url)
        url_path = parsed.path.split("?")[0]
        ext = Path(url_path).suffix.lower()
        if not ext or ext not in SUPPORTED_EXTENSIONS:
            ext = ".pdf"

        tmp_dir = tempfile.mkdtemp()
        tmp_file = os.path.join(tmp_dir, f"submission{ext}")

        try:
            print(f"  Downloading: {file_url[:80]}...")
            self._download_url(file_url, tmp_file)

            print(f"  Extracting text...")
            text = self._extract_text(tmp_file)

            if not text.strip():
                return {
                    "status": "error",
                    "message": "No extractable text found in submission file",
                }

            print(f"  Embedding ({len(text)} chars)...")
            embedding = self.embedder.embed_query(text)

            # Upsert into Pinecone — vector ID is student_id so re-submits overwrite
            vector_id = f"student_{student_id}"
            self.index.upsert(
                vectors=[
                    {
                        "id": vector_id,
                        "values": embedding,
                        "metadata": {
                            "student_id": student_id,
                            "student_name": student_name,
                            "file_url": file_url,
                            "text_length": len(text),
                            "deliverable_id": deliverable_id,
                        },
                    }
                ],
                namespace=namespace,
            )

            print(f"  Stored in namespace '{namespace}' as '{vector_id}'")
            return {
                "status": "success",
                "student_id": student_id,
                "deliverable_id": deliverable_id,
                "namespace": namespace,
                "text_length": len(text),
            }

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    # ── Step 2: Called when teacher requests plagiarism report ────────────────

    def run_report_from_vectors(
        self,
        deliverable_id: str,
        threshold: float = SIMILARITY_THRESHOLD,
    ) -> Dict[str, Any]:
        """
        Fetch pre-stored embeddings from Pinecone for this deliverable and
        compute pairwise cosine similarity. No file downloading or re-embedding.
        """
        namespace = self._namespace_for(deliverable_id)
        print(f"[run_report] namespace={namespace}, threshold={threshold}")

        # ── Collect all vector IDs in this namespace ──────────────────────────
        all_ids: List[str] = []
        try:
            for id_batch in self.index.list(namespace=namespace):
                if id_batch:
                    all_ids.extend(id_batch)
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to list vectors in Pinecone: {str(e)}",
            }

        if len(all_ids) < 2:
            return {
                "status": "error",
                "message": (
                    f"Only {len(all_ids)} embedded submission(s) found. "
                    "Need at least 2 to compare. Students may not have submitted yet, "
                    "or submissions are still being embedded."
                ),
            }

        # ── Fetch vectors WITH values ─────────────────────────────────────────
        fetched = self.index.fetch(ids=all_ids, namespace=namespace)

        submissions = []
        for vid, vec in fetched.vectors.items():
            meta = vec.metadata or {}
            submissions.append(
                {
                    "vector_id": vid,
                    "student_id": meta.get("student_id", vid),
                    "student_name": meta.get("student_name", "Unknown"),
                    "file_url": meta.get("file_url", ""),
                    "embedding": list(vec.values),
                }
            )

        if len(submissions) < 2:
            return {
                "status": "error",
                "message": "Not enough embedded submissions to compare.",
            }

        n = len(submissions)
        names = [s["student_name"] for s in submissions]
        ids = [s["student_id"] for s in submissions]
        print(f"Computing {n * (n - 1) // 2} pairwise comparisons for {n} submissions...")

        # ── Pairwise cosine similarity ────────────────────────────────────────
        matrix = [[0.0] * n for _ in range(n)]
        pairs = []

        for i in range(n):
            matrix[i][i] = 100.0
            for j in range(i + 1, n):
                sim = self._cosine_similarity(
                    submissions[i]["embedding"],
                    submissions[j]["embedding"],
                )
                sim_percent = round(sim * 100, 2)
                matrix[i][j] = sim_percent
                matrix[j][i] = sim_percent

                pairs.append(
                    {
                        "student_a": {
                            "id": ids[i],
                            "name": names[i],
                        },
                        "student_b": {
                            "id": ids[j],
                            "name": names[j],
                        },
                        "similarity": sim_percent,
                        "flagged": sim_percent >= (threshold * 100),
                    }
                )

        pairs.sort(key=lambda p: p["similarity"], reverse=True)
        flagged_count = sum(1 for p in pairs if p["flagged"])

        report = {
            "status": "success",
            "deliverable_id": deliverable_id,
            "total_submissions": n,
            "total_pairs": len(pairs),
            "flagged_pairs": flagged_count,
            "threshold_percent": round(threshold * 100, 2),
            "pairs": pairs,
            "matrix": {
                "students": [
                    {"id": ids[i], "name": names[i]} for i in range(n)
                ],
                "scores": matrix,
            },
        }

        print(
            f"Report done: {n} submissions, {len(pairs)} pairs, {flagged_count} flagged"
        )
        return report
