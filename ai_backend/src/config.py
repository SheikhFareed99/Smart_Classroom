import os
from dotenv import load_dotenv

load_dotenv()

PINECONE_API_KEY = os.getenv("pine_corn_api")
GROQ_API_KEY = os.getenv("groq_api")

PINECONE_INDEX_NAME = "smart-classroom"
PINECONE_CLOUD = "aws"
PINECONE_REGION = "us-east-1"

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

GROQ_MODEL = "llama-3.3-70b-versatile"

CHUNK_MAX_CHARS = 3000
CHUNK_NEW_AFTER = 2400
CHUNK_COMBINE_UNDER = 500

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".pptx", ".ppt"}
