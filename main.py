# main.py (Final version for Phase 2)

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import tempfile
import os

# Import the core logic functions
from core import load_document, chunk_document, create_vector_store, create_qa_chain

app = FastAPI(
    title="QueryPrism API",
    description="An API for the QueryPrism Retrieval-Augmented Generation (RAG) application.",
    version="1.0.0"
)

# In-memory storage for the vector store
vector_store = None
qa_chain = None

# Pydantic model for the query request body
class QueryRequest(BaseModel):
    query: str
    model: str = "mistral" # Default model

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(status_code=500, content={"message": f"An unexpected error occurred: {exc}"})

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the QueryPrism API!"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    global vector_store, qa_chain
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        pages = load_document(tmp_path)
        chunks = chunk_document(pages)
        vector_store = create_vector_store(chunks)
        # We create the chain here to be ready for queries
        qa_chain = create_qa_chain(vector_store)

        return {"status": "success", "message": f"File '{file.filename}' processed successfully."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {e}")

    finally:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/query")
async def query_document(request: QueryRequest):
    global qa_chain
    if qa_chain is None:
        raise HTTPException(status_code=400, detail="No document has been uploaded and processed yet.")

    try:
        # We can optionally re-create the chain if the model changes
        # For simplicity, we assume the model is the same as the one used at upload
        result = qa_chain.invoke({"query": request.query})
        return {"status": "success", "answer": result['result']}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get answer: {e}")