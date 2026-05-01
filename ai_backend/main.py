from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from src.pipeline import IngestionPipeline
from src.retriever import Retriever
from src.vector_store import VectorStore
from src.similarity import SimilarityChecker

app = FastAPI(title="Smart Classroom RAG API", version="2.0.0")

# Allow requests from the MERN backend (and any origin for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_pipeline = None
_retriever = None
_vector_store = None
_similarity_checker = None


def get_pipeline() -> IngestionPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = IngestionPipeline()
    return _pipeline


def get_retriever() -> Retriever:
    global _retriever
    if _retriever is None:
        _retriever = Retriever()
    return _retriever


def get_vector_store() -> VectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store


def get_similarity_checker() -> SimilarityChecker:
    global _similarity_checker
    if _similarity_checker is None:
        _similarity_checker = SimilarityChecker()
    return _similarity_checker


class IngestRequest(BaseModel):
    url: str
    book_name: str


class QueryRequest(BaseModel):
    book_name: str
    query: str
    top_k: int = 5


class PlagiarismSubmission(BaseModel):
    student_id: str
    student_name: str
    file_url: str


class PlagiarismCheckRequest(BaseModel):
    deliverable_id: str
    threshold_percent: float = 70
    submissions: list[PlagiarismSubmission]


@app.get("/")
def root():
    return {"status": "ok", "message": "Smart Classroom RAG API v2"}


# ── List all namespaces (one per indexed material) ─────────────────────────────
@app.get("/namespaces")
def list_namespaces():
    """Returns all namespaces (i.e. material book_names) that have vectors stored."""
    try:
        vs = get_vector_store()
        stats = vs.index.describe_index_stats()
        namespaces = list(stats.namespaces.keys()) if stats.namespaces else []
        return JSONResponse(content={"namespaces": namespaces})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Ingest (blocking) ──────────────────────────────────────────────────────────
@app.post("/ingest")
def ingest(req: IngestRequest):
    try:
        pipeline = get_pipeline()
        result = pipeline.ingest_from_url(req.url, req.book_name)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Ingest async (fire-and-forget) ─────────────────────────────────────────────
def _run_ingest(url: str, book_name: str):
    try:
        pipeline = get_pipeline()
        pipeline.ingest_from_url(url, book_name)
        print(f"[async ingest] done: {book_name}")
    except Exception as e:
        print(f"[async ingest] error for {book_name}: {e}")


@app.post("/ingest-async")
def ingest_async(req: IngestRequest, background_tasks: BackgroundTasks):
    """Start ingestion in background and return immediately."""
    background_tasks.add_task(_run_ingest, req.url, req.book_name)
    return JSONResponse(content={"status": "queued", "book_name": req.book_name})


# ── Query ──────────────────────────────────────────────────────────────────────
@app.post("/query")
def query(req: QueryRequest):
    try:
        retriever = get_retriever()
        result = retriever.generate_answer(
            req.query, top_k=req.top_k, namespace=req.book_name
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/plagiarism/check")
def plagiarism_check(req: PlagiarismCheckRequest):
    try:
        if len(req.submissions) < 2:
            return JSONResponse(
                content={
                    "status": "error",
                    "message": "Need at least 2 submissions to compare",
                    "deliverable_id": req.deliverable_id,
                    "total_submissions": len(req.submissions),
                },
                status_code=400,
            )

        checker = get_similarity_checker()
        for sub in req.submissions:
            checker.embed_and_store(
                file_url=sub.file_url,
                deliverable_id=req.deliverable_id,
                student_id=sub.student_id,
                student_name=sub.student_name,
            )

        report = checker.run_report_from_vectors(
            deliverable_id=req.deliverable_id,
            threshold=max(0.0, min(1.0, req.threshold_percent / 100.0)),
        )

        status_code = 200 if report.get("status") == "success" else 400
        return JSONResponse(content=report, status_code=status_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
