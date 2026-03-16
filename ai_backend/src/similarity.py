import os
import tempfile
import shutil
import numpy as np
from typing import List, Dict, Any
from azure.storage.blob import BlobServiceClient
from src.loader import DocumentLoader
from src.embedder import Embedder
from src.config import (
    AZURE_CONNECTION_STRING,
    AZURE_BLOB_CONTAINER,
    SIMILARITY_THRESHOLD,
    SUPPORTED_EXTENSIONS,
)


class SimilarityChecker:

    def __init__(self):
        print("Initializing SimilarityChecker...")
        self.blob_service = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)
        self.container = self.blob_service.get_container_client(AZURE_BLOB_CONTAINER)
        self.loader = DocumentLoader()
        self.embedder = Embedder()
        print("SimilarityChecker ready")

    def _list_files_in_folder(self, folder_path: str) -> List[str]:
        folder_path = folder_path.strip("/") + "/"
        blobs = []
        for blob in self.container.list_blobs(name_starts_with=folder_path):
            ext = os.path.splitext(blob.name)[1].lower()
            if ext in SUPPORTED_EXTENSIONS:
                blobs.append(blob.name)
        return blobs

    def _download_blob(self, blob_name: str, dest_path: str):
        blob_client = self.container.get_blob_client(blob_name)
        with open(dest_path, "wb") as f:
            f.write(blob_client.download_blob().readall())

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

    def run_report(
        self, folder_path: str, threshold: float = SIMILARITY_THRESHOLD
    ) -> Dict[str, Any]:
        print(f"Running similarity report for folder: {folder_path}")

        blob_names = self._list_files_in_folder(folder_path)
        if len(blob_names) < 2:
            return {
                "status": "error",
                "message": f"Need at least 2 files, found {len(blob_names)} in '{folder_path}'",
            }

        print(f"Found {len(blob_names)} files")

        tmp_dir = tempfile.mkdtemp()
        submissions = []

        try:
            for blob_name in blob_names:
                file_name = os.path.basename(blob_name)
                local_path = os.path.join(tmp_dir, file_name)

                print(f"  Downloading: {file_name}")
                self._download_blob(blob_name, local_path)

                print(f"  Extracting text: {file_name}")
                text = self._extract_text(local_path)

                if not text.strip():
                    print(f"  Skipped (no text): {file_name}")
                    continue

                print(f"  Embedding: {file_name}")
                embedding = self.embedder.embed_query(text)

                submissions.append({
                    "file_name": file_name,
                    "embedding": embedding,
                    "text_length": len(text),
                })

            if len(submissions) < 2:
                return {
                    "status": "error",
                    "message": f"Only {len(submissions)} files had extractable text, need at least 2",
                }

            n = len(submissions)
            file_names = [s["file_name"] for s in submissions]

            print(f"Computing {n * (n - 1) // 2} pairwise comparisons...")

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

                    pairs.append({
                        "file_a": file_names[i],
                        "file_b": file_names[j],
                        "similarity": sim_percent,
                        "flagged": sim >= threshold,
                    })

            pairs.sort(key=lambda p: p["similarity"], reverse=True)
            flagged_count = sum(1 for p in pairs if p["flagged"])

            report = {
                "status": "success",
                "folder_path": folder_path,
                "total_files": n,
                "total_pairs": len(pairs),
                "flagged_pairs": flagged_count,
                "threshold_percent": round(threshold * 100, 2),
                "pairs": pairs,
                "matrix": {
                    "files": file_names,
                    "scores": matrix,
                },
            }

            print(f"Report complete: {n} files, {len(pairs)} pairs, {flagged_count} flagged")
            return report

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)
