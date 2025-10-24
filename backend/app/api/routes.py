# backend/app/api/routes.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import tempfile
import os
import uuid

# Import core logic
from app.core import rag
from app.core.config import settings

# Import schemas
from app import schemas, models

# Import database session
from app.database import get_db

# Import the authentication dependency
from app.api.dependencies import get_current_user

router = APIRouter()
os.makedirs(settings.VECTOR_STORE_DIR, exist_ok=True)


@router.post("/upload", response_model=schemas.UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db), # Inject DB session
    current_user: models.User = Depends(get_current_user) # Get logged-in user
):
    """
    Handles file upload, processing, and saving the document
    reference to the PostgreSQL database.
    """
    tmp_path = ""
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        pages = rag.load_document(tmp_path)
        chunks = rag.chunk_document(pages)
        if not chunks:
            raise HTTPException(status_code=400, detail="Document is empty.")

        vector_store = rag.create_vector_store(chunks)
        document_id = str(uuid.uuid4())
        store_path = os.path.join(settings.VECTOR_STORE_DIR, document_id)
        vector_store.save_local(store_path)

        # --- Create Document record in PostgreSQL ---
        new_document = models.Document(
            document_id=document_id,
            original_filename=file.filename,
            owner_id=current_user.id  # Link to the user
        )
        db.add(new_document)
        db.commit()

        return {
            "document_id": document_id, 
            "message": f"File '{file.filename}' processed successfully."
        }
    except Exception as e:
        db.rollback() # Rollback DB changes on error
        print(f"Error during upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/query", response_model=schemas.QueryResponse)
async def query_document(
    request: schemas.QueryRequest,
    db: Session = Depends(get_db), # Inject DB session
    current_user: models.User = Depends(get_current_user) # Get logged-in user
):
    """
    Answers a query, first checking PostgreSQL to ensure
    the user owns the document.
    """
    
    # --- Check document ownership in PostgreSQL ---
    document = db.query(models.Document).filter(
        models.Document.document_id == request.document_id,
        models.Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Document not found or you do not have permission."
        )

    store_path = os.path.join(settings.VECTOR_STORE_DIR, request.document_id)
    if not os.path.normpath(store_path).startswith(os.path.abspath(settings.VECTOR_STORE_DIR)):
        raise HTTPException(status_code=400, detail="Invalid document_id path")

    try:
        vector_store = rag.load_vector_store(store_path)
        qa_chain = rag.create_qa_chain(vector_store)
        
        # --- (MODIFIED) ---
        # The new LCEL chain takes the query string directly
        answer_string = qa_chain.invoke(request.query)
        
        return {"answer": answer_string}
        # --- (END MODIFICATION) ---

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Vector store not found on disk.")
    except Exception as e:
        print(f"Error during query: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get answer: {str(e)}")