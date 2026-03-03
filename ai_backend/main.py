import os
import shutil
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from src.pipeline import IngestionPipeline
from src.retriever import Retriever

app = FastAPI(title="Smart Classroom RAG API", version="1.0.0")

_pipeline = None
_retriever = None

UPLOAD_DIR = Path("./doc")
UPLOAD_DIR.mkdir(exist_ok=True)


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


class QueryRequest(BaseModel):
    query: str
    top_k: int = 5


class IngestDirRequest(BaseModel):
    directory: str


@app.get("/")
def root():
    return {"status": "ok", "message": "Smart Classroom RAG API"}


@app.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in {".pdf", ".docx", ".doc", ".pptx", ".ppt"}:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    save_path = UPLOAD_DIR / file.filename
    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        pipeline = get_pipeline()
        result = pipeline.ingest_file(str(save_path))
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest/directory")
def ingest_directory(req: IngestDirRequest):
    if not Path(req.directory).is_dir():
        raise HTTPException(status_code=400, detail="Directory not found")

    try:
        pipeline = get_pipeline()
        result = pipeline.ingest_directory(req.directory)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
def query(req: QueryRequest):
    try:
        retriever = get_retriever()
        result = retriever.generate_answer(req.query, top_k=req.top_k)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search")
def search(q: str, top_k: int = 5):
    try:
        retriever = get_retriever()
        results = retriever.retrieve(q, top_k=top_k)
        return JSONResponse(content={"query": q, "results": results})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
