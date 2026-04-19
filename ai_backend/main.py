from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from src.pipeline import IngestionPipeline
from src.retriever import Retriever
from src.vector_store import VectorStore

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


class IngestRequest(BaseModel):
    url: str
    book_name: str


class QueryRequest(BaseModel):
    book_name: str
    query: str
    top_k: int = 5


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
