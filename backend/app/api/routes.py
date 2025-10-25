# backend/app/api/routes.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status, Path
from sqlalchemy.orm import Session
import tempfile
import os
import uuid # useful for temporary filenames if needed
from app.vector_db import get_chroma_collection_object

from app.core import rag 

from app.core.config import settings

# Importing the Pydantic schemas (models)
from app import schemas, models 

# Imporing database session dependency
from app.database import get_db

# Importing the authentication dependency
from app.api.dependencies import get_current_user

router = APIRouter()

# Endpoint to list user's documents 
@router.get("/documents", response_model=list[str])
async def list_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Fetches a list of original filenames the user has uploaded."""
    documents = db.query(models.Document.original_filename).filter(
        models.Document.owner_id == current_user.id
    ).order_by(models.Document.uploaded_at.desc()).all()
    
    return [doc[0] for doc in documents]

# Upload Endpoint 
@router.post("/upload", response_model=schemas.UploadResponse) # Keep UploadResponse for now
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user) 
):
    """
    Handles file upload, processing, and adding vectors to ChromaDB.
    Also records the upload in the PostgreSQL 'documents' table.
    """
    tmp_path = ""
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # 1. Load and Chunk 
        pages = rag.load_document(tmp_path)
        chunks = rag.chunk_document(pages)
        if not chunks:
            raise HTTPException(status_code=400, detail="Document is empty or could not be processed.")

        # 2. Add Chunks to ChromaDB 
        # Pass user ID and original filename for metadata
        rag.add_documents_to_chroma(
            chunks=chunks, 
            user_id=current_user.id, 
            source_filename=file.filename
        )

        # 3. Record Upload in PostgreSQL
        # Check if this user has uploaded this filename before 
        existing_doc = db.query(models.Document).filter(
            models.Document.owner_id == current_user.id,
            models.Document.original_filename == file.filename
        ).first()
        
        if not existing_doc:
            new_document_record = models.Document(
                original_filename=file.filename,
                owner_id=current_user.id 
            )
            db.add(new_document_record)
            db.commit()
        else:
             # update an 'updated_at' timestamp if the doc exists
             pass 

        dummy_doc_id = str(uuid.uuid4()) # Placeholder

        return {
            "document_id": f"processed_{file.filename}", # Or use filename
            "message": f"File '{file.filename}' processed and added to knowledge base."
        }
    except Exception as e:
        db.rollback() # Rollback DB changes on error
        print(f"Error during upload: {e}")
        # Consider more specific error handling based on ChromaDB/LLM errors
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# Query Endpoint 
@router.post("/query", response_model=schemas.QueryResponse)
async def query_documents_for_user( 
    request: schemas.UserQueryRequest,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user) 
):
    """
    Answers a query based on *all* documents previously uploaded by the user.
    Uses ChromaDB with metadata filtering.
    """

    try:
        # Creating Q&A chain, now passing only the user_id
        qa_chain = rag.create_qa_chain(user_id=current_user.id)
        
        # Invoke the chain with the user's query string
        answer_string = qa_chain.invoke(request.query)
        
        return {"answer": answer_string}
        
    except Exception as e:
        print(f"Error during query for user {current_user.id}: {e}")
        # Consider specific error handling
        raise HTTPException(status_code=500, detail=f"Failed to get answer: {str(e)}")
    
@router.delete("/documents/{filename}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    filename: str = Path(..., description="The name of the file to delete"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Deletes a document record from PostgreSQL and its associated vectors
    from ChromaDB based on the original filename for the current user.
    """
    # 1. Find the document record in PostgreSQL
    document_record = db.query(models.Document).filter(
        models.Document.owner_id == current_user.id,
        models.Document.original_filename == filename
    ).first()

    if not document_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{filename}' not found for this user."
        )

    # 2. Delete vectors from ChromaDB
    try:
        chroma_collection = get_chroma_collection_object()
        print(f"Attempting to delete vectors from ChromaDB for user {current_user.id} and filename '{filename}'...")

        # Delete using metadata filter
        chroma_collection.delete(
            where={
                "user_id": str(current_user.id),
                "source_filename": filename
            }
        )
        print("Vectors deleted from ChromaDB successfully (if any existed).")

    except Exception as e:
        # Log the error but proceed to delete from PGSQL
        print(f"Warning: Could not delete vectors from ChromaDB for {filename}: {e}")

    # 3. Delete the record from PostgreSQL
    try:
        db.delete(document_record)
        db.commit()
        print(f"Document record '{filename}' deleted from PostgreSQL.")
    except Exception as e:
        db.rollback()
        print(f"Error deleting document record '{filename}' from PostgreSQL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document record from database."
        )

    # Return No Content on success
    return None 