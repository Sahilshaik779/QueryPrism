# backend/app/api/routes.py

from fastapi import (
    APIRouter, UploadFile, File, HTTPException, # <-- Ensure HTTPException is imported here
    Depends, status, Path, BackgroundTasks
)
from sqlalchemy.orm import Session
import tempfile
import os
import uuid # Used for placeholder response in upload

# Import core RAG logic
from app.core import rag
# Import config settings
from app.core.config import settings
# Import vector DB utilities
from app.vector_db import get_chroma_collection_object
# Import Google Drive service functions
from app.core.drive_service import sync_drive_folder # Import sync function

# Import Pydantic schemas and SQLAlchemy models
from app import schemas, models
from app.schemas import SetFolderRequest # Explicitly import needed schema

# Import database session dependency
from app.database import get_db

# Import authentication dependency
from app.api.dependencies import get_current_user


router = APIRouter()

# --- Document Management Endpoints ---

@router.get("/documents", response_model=list[str])
async def list_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Fetches a list of original filenames the user has uploaded."""
    documents = db.query(models.Document.original_filename).filter(
        models.Document.owner_id == current_user.id
    ).order_by(models.Document.uploaded_at.desc()).all()
    # Extract filename string from the tuple result
    return [doc[0] for doc in documents]

@router.post("/upload", response_model=schemas.UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Handles file upload, processing, adding vectors to ChromaDB,
    and recording the upload in PostgreSQL.
    """
    tmp_path = ""
    try:
        # Save uploaded file temporarily to disk
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Load and chunk the document using core RAG logic
        pages = rag.load_document(tmp_path)
        chunks = rag.chunk_document(pages)
        if not chunks:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document is empty or could not be processed.")

        # Add document chunks to ChromaDB vector store with user metadata
        rag.add_documents_to_chroma(
            chunks=chunks,
            user_id=current_user.id,
            source_filename=file.filename
        )

        # Record the uploaded document filename in PostgreSQL if not already present
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
             # Optionally update an 'updated_at' timestamp if the doc exists
             pass # Placeholder for potential update logic

        # Return success response (using filename as placeholder ID)
        return {
            "document_id": f"processed_{file.filename}",
            "message": f"File '{file.filename}' processed and added to knowledge base."
        }
    except Exception as e:
        db.rollback() # Ensure DB transaction is rolled back on error
        print(f"Error during upload: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process file: {str(e)}")
    finally:
        # Clean up temporary file
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.delete("/documents/{filename}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    filename: str = Path(..., min_length=1, description="The URL-encoded name of the file to delete"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Deletes a document record from PostgreSQL and associated vectors from ChromaDB.
    """
    # Find the document metadata in PostgreSQL
    document_record = db.query(models.Document).filter(
        models.Document.owner_id == current_user.id,
        models.Document.original_filename == filename
    ).first()

    if not document_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{filename}' not found for this user."
        )

    # Attempt to delete vectors from ChromaDB
    try:
        chroma_collection = get_chroma_collection_object()
        print(f"Attempting to delete vectors from ChromaDB for user {current_user.id} and filename '{filename}'...")
        chroma_collection.delete(
            where={
                "user_id": str(current_user.id),
                "source_filename": filename
            }
        )
        print("Vectors deleted from ChromaDB successfully (if any existed).")
    except Exception as e:
        # Log error but continue to attempt deletion from PostgreSQL
        print(f"Warning: Could not delete vectors from ChromaDB for {filename}: {e}")

    # Delete the record from PostgreSQL
    try:
        db.delete(document_record)
        db.commit()
        print(f"Document record '{filename}' deleted from PostgreSQL.")
    except Exception as e:
        db.rollback() # Rollback DB transaction on error
        print(f"Error deleting document record '{filename}' from PostgreSQL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document record from database."
        )

    # Return success (No Content)
    return None

# --- RAG Query Endpoint ---

@router.post("/query", response_model=schemas.QueryResponse)
async def query_documents_for_user(
    request: schemas.UserQueryRequest, # Requires only the query string
    db: Session = Depends(get_db), # Included for consistency, though not directly used here
    current_user: models.User = Depends(get_current_user)
):
    """
    Answers a query based on all documents previously uploaded by the user,
    using ChromaDB with metadata filtering by user ID.
    """
    try:
        # Create the RAG chain, filtered for the current user
        qa_chain = rag.create_qa_chain(user_id=current_user.id)

        # Invoke the chain to get the answer
        answer_string = qa_chain.invoke(request.query)

        return {"answer": answer_string}

    except Exception as e:
        print(f"Error during query for user {current_user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get answer: {str(e)}")

# --- Google Drive Integration Endpoints ---

@router.post("/drive/folder", status_code=status.HTTP_200_OK, response_model=schemas.SimpleResponse)
async def set_drive_folder(
    request: SetFolderRequest, # Use the schema imported from app.schemas
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Saves the specified Google Drive Folder ID to the user's profile."""
    # Basic validation for the Folder ID format (can be improved)
    if not request.folder_id or len(request.folder_id) < 10: # Example length check
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Folder ID format provided.")

    current_user.drive_folder_id = request.folder_id
    db.commit()

    print(f"Set Drive Folder ID for user {current_user.email} to {request.folder_id}")
    return {"message": "Google Drive folder ID saved successfully."}


@router.post("/drive/sync", response_model=schemas.SimpleResponse)
async def trigger_drive_sync(
    # background_tasks: BackgroundTasks, # Inject BackgroundTasks for async execution
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Triggers the synchronization process for the user's connected Google Drive folder.
    Downloads files, processes them, and adds to the knowledge base.
    """
    # Validate user has configured Drive folder and has credentials
    if not current_user.drive_folder_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No Google Drive folder ID is configured for this user.")
    if not current_user.google_refresh_token:
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google Drive is not connected or authorization expired.")

    print(f"Received sync request for user {current_user.email}")

    # --- Option A: Run Synchronously (Simpler for now, blocks the request) ---
    try:
        # Call the main sync function from the drive service
        result = sync_drive_folder(user=current_user, db=db)
        # Return the message provided by the sync function
        return {"message": result.get("message", "Sync process finished.")}
    except HTTPException as http_exc:
         # Re-raise HTTPExceptions (like 401 Unauthorized) from sync_drive_folder
         raise http_exc
    except Exception as e:
         # Catch any other unexpected errors during the sync
         print(f"Unexpected error during sync trigger for user {current_user.email}: {e}")
         # Make sure HTTPException is available before raising it
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred during sync: {str(e)}")

    # --- Option B: Run as Background Task (Better UX, returns immediately) ---
    # print(f"Adding sync task to background for user {current_user.email}")
    # background_tasks.add_task(sync_drive_folder, user=current_user, db=db)
    # return {"message": "Google Drive synchronization started in the background."}
    # Note: Requires careful session management if using BackgroundTasks or Celery.