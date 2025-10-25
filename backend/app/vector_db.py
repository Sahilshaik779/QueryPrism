import chromadb
from app.core.config import settings
import os

os.makedirs(settings.VECTOR_STORE_DIR, exist_ok=True) 

client = chromadb.PersistentClient(path=settings.VECTOR_STORE_DIR)
COLLECTION_NAME = "user_documents"

# Get or Create Collection 
collection = client.get_or_create_collection(
    name=COLLECTION_NAME
)

print(f"ChromaDB client initialized. Collection '{COLLECTION_NAME}' object created.")

def get_chroma_client():
    return client

def get_chroma_collection_name():
    return COLLECTION_NAME

def get_chroma_collection_object():
    """Returns the initialized low-level ChromaDB collection object."""
    return client.get_or_create_collection(name=COLLECTION_NAME)
