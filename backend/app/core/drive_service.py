# backend/app/core/drive_service.py

import io
import os
import tempfile # For creating temporary files
from datetime import datetime, timezone
from fastapi import HTTPException, status # Import status and HTTPException
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
# Flow is not directly used here but related to the overall auth process
# from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build # Builds the service object
from googleapiclient.http import MediaIoBaseDownload # Handles file downloads
from sqlalchemy.orm import Session

from app import models # Database User model
from app.core.config import settings # Application settings
# Import RAG processing functions
from app.core import rag

# Ensure SCOPES match those defined in api/auth.py
SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    # --- ENSURE ONLY READONLY IS HERE ---
    'https://www.googleapis.com/auth/drive.readonly'
    # --- REMOVE drive.file ---
]

## Authentication
# ================
def get_drive_service(user: models.User, db: Session):
    """
    Authenticates with Google Drive API using stored user credentials.

    Refreshes the access token if necessary using the stored refresh token
    and updates the expiry time in the database.

    Args:
        user: The SQLAlchemy User object containing credential info.
        db: The SQLAlchemy database session.

    Returns:
        A Google API client service object for Google Drive API v3.

    Raises:
        ValueError: If the user lacks a refresh token or credentials are invalid.
        Exception: If token refresh fails or the Google Drive service build fails.
    """
    print("-" * 20)
    print("get_drive_service called:")
    print(f"User: {user.email}")
    print(f"Stored refresh token: {user.google_refresh_token[:10] if user.google_refresh_token else 'None'}")

    if not user.google_refresh_token:
        print(f"User {user.email} missing Google refresh token.")
        raise ValueError("Google account not fully connected or refresh token missing.")

    # Create credentials object from stored data
    credentials = Credentials(
        token=None, # Access token starts as None; relies on refresh
        refresh_token=user.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES
    )

    # Attempt refresh if credentials are not valid AND a refresh token exists
    if not credentials.valid and credentials.refresh_token:
        print(f"Credentials not valid. Attempting refresh for {user.email}...")
        try:
            # Force refresh attempt
            credentials.refresh(Request())
            print("Token refreshed successfully via credentials.refresh().")
            # Update expiry in DB if present
            if credentials.expiry:
                user.google_token_expiry = credentials.expiry.replace(tzinfo=timezone.utc)
                db.commit()
                print(f"Updated token expiry in DB for user {user.email}")
            else:
                user.google_token_expiry = None
                db.commit()
        except Exception as e:
            # Handle refresh failure (token likely revoked or invalid)
            print(f"!!! credentials.refresh() FAILED for user {user.email}: {e}")
            # Consider invalidating the stored token as it's unusable
            # user.google_refresh_token = None
            # user.google_token_expiry = None
            # db.commit() # Uncomment to clear bad token from DB
            # Raise exception to signal failure
            raise Exception(f"Could not refresh Google API token (likely revoked or invalid): {e}")
    elif not credentials.valid and not credentials.refresh_token:
         # Should not happen if we check user.google_refresh_token earlier, but good failsafe
         print(f"Credentials invalid and no refresh token available for user {user.email}")
         raise ValueError("Invalid Google credentials and no refresh token found.")

    # If credentials are now valid (either initially or after refresh)
    if credentials.valid:
        try:
            # Build the Google Drive API service client (v3)
            service = build('drive', 'v3', credentials=credentials)
            print(f"Google Drive service built successfully.")
            print("-" * 20)
            return service
        except Exception as e:
             print(f"!!! Error building Google Drive service: {e}")
             print("-" * 20)
             raise Exception(f"Could not build Google Drive service: {e}")
    else:
        # Should only reach here if refresh failed above and wasn't caught/raised properly
        print(f"Credentials remain invalid after refresh check for user {user.email}")
        raise ValueError("Invalid Google credentials after refresh attempt.")


## File Operations
# =================

def list_files_in_folder(service, folder_id: str):
    """
    Lists supported files (PDF, DOCX, CSV) within a given Google Drive folder ID.

    Args:
        service: Authenticated Google Drive API service object.
        folder_id: The ID of the Google Drive folder to scan.

    Returns:
        A list of dictionaries, each containing 'id' and 'name' of a relevant file.
        Returns an empty list if the folder is empty or on error during listing.
    """
    files_list = []
    page_token = None
    # Define MIME types for supported files (without extra quotes initially)
    supported_mime_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", # DOCX
        "text/csv"
    ]
    # Construct the 'mimeType = ... or mimeType = ...' part correctly
    mime_type_conditions = " or ".join([f"mimeType='{mt}'" for mt in supported_mime_types])

    # Construct the full query, ensuring correct spacing and parentheses
    query = f"'{folder_id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false and ({mime_type_conditions})"
    print(f"Querying Google Drive with: {query}")

    try:
        # Loop to handle pagination of results from the Drive API
        while True:
            results = service.files().list(
                q=query,
                spaces='drive', # Search within Google Drive space
                fields='nextPageToken, files(id, name)', # Specify required fields (id, name)
                pageToken=page_token
            ).execute()

            items = results.get('files', [])
            if items:
                print(f"Found {len(items)} files in current page...")
                # Add found file details (id and name) to the list
                files_list.extend([{'id': item['id'], 'name': item['name']} for item in items])

            # Get token for the next page, if it exists
            page_token = results.get('nextPageToken', None)
            if page_token is None:
                break # Exit loop if this was the last page

        print(f"Found total {len(files_list)} relevant files in folder '{folder_id}'.")
        return files_list

    except Exception as e:
        print(f"An error occurred while listing files in folder '{folder_id}': {e}")
        # Consider specific error handling (e.g., permissions error, folder not found)
        return [] # Return an empty list on error


def download_file(service, file_id: str, file_name: str, temp_dir: str) -> str | None:
    """
    Downloads a file from Google Drive to a specified temporary directory.

    Args:
        service: Authenticated Google Drive API service object.
        file_id: The ID of the Google Drive file to download.
        file_name: The original name of the file (used for saving).
        temp_dir: The directory to save the downloaded file in.

    Returns:
        The full path to the downloaded temporary file, or None if download fails.
    """
    # Construct the full path within the provided temporary directory
    temp_file_path = os.path.join(temp_dir, f"drive_{file_id}_{file_name}")
    print(f"Attempting to download file ID '{file_id}' ({file_name}) to '{temp_file_path}'...")
    try:
        # Prepare the file download request using the Drive API
        request = service.files().get_media(fileId=file_id)
        # Use an in-memory buffer (BytesIO) to handle the download stream efficiently
        fh = io.BytesIO()
        # Create a MediaIoBaseDownload object to manage the download process (handles chunking)
        downloader = MediaIoBaseDownload(fh, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()
            if status:
                print(f"Download {int(status.progress() * 100)}%.") # Progress indicator

        # Once download is complete, write the buffer's content to the temporary file
        fh.seek(0) # Go to the beginning of the buffer
        with open(temp_file_path, 'wb') as f:
            f.write(fh.read()) # Write content to the named temp file

        print(f"Successfully downloaded '{file_name}' to temporary path.")
        return temp_file_path # Return the path to the downloaded file

    except Exception as e:
        print(f"An error occurred downloading file ID '{file_id}' ({file_name}): {e}")
        # Clean up the temporary file if it was created and an error occurred
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                print(f"Cleaned up partially downloaded temporary file: {temp_file_path}")
            except OSError as cleanup_error:
                print(f"Error cleaning up temporary file {temp_file_path}: {cleanup_error}")
        return None # Indicate download failure


## Sync Orchestration
# ==================

def sync_drive_folder(user: models.User, db: Session):
    """
    Performs the full sync process for a user's selected Google Drive folder.

    1. Authenticates with Google Drive using the user's refresh token.
    2. Lists supported files (PDF, DOCX, CSV) in the user's specified folder.
    3. Downloads each file to a temporary location.
    4. Processes each file using the RAG pipeline (load, chunk, add to ChromaDB).
    5. Records the processed file's name in PostgreSQL if not already present.
    6. Cleans up temporary files.

    Args:
        user: The SQLAlchemy User object.
        db: The SQLAlchemy database session.

    Returns:
        A dictionary containing the status and results of the sync operation.

    Raises:
        HTTPException: If authentication fails or a major error occurs during sync.
    """
    # Check if a folder ID is configured for the user
    if not user.drive_folder_id:
        print(f"User {user.email} has no Drive Folder ID set. Skipping sync.")
        # Return a status that the frontend can understand
        return {"status": "skipped", "message": "No Google Drive folder ID is configured."}

    print(f"Starting Google Drive sync for user {user.email}, folder ID: {user.drive_folder_id}")
    processed_files_count = 0
    failed_files_info = []

    try:
        # 1. Authenticate and get the Google Drive service object
        drive_service = get_drive_service(user, db)

        # 2. List relevant files in the specified folder
        files_to_process = list_files_in_folder(drive_service, user.drive_folder_id)

        if not files_to_process:
            print(f"No new supported files found in folder {user.drive_folder_id} for user {user.email}.")
            return {"status": "success", "message": "No new files found to process.", "processed_count": 0, "failed_files": []}

        # Create a single temporary directory for all downloads in this sync run
        with tempfile.TemporaryDirectory(prefix="drive_sync_") as temp_dir:
            print(f"Using temporary directory for downloads: {temp_dir}")

            # Iterate through the files found in the Drive folder
            for file_info in files_to_process:
                file_id = file_info['id']
                file_name = file_info['name']
                temp_file_path = None # Ensure path is reset for each loop iteration

                try:
                    print(f"\nProcessing file: {file_name} (ID: {file_id})")
                    # 3. Download the file
                    # Pass the shared temporary directory to the download function
                    temp_file_path = download_file(drive_service, file_id, file_name, temp_dir)

                    if temp_file_path:
                        # 4. Process the downloaded file using the RAG pipeline
                        print(f"Loading and chunking {file_name} from {temp_file_path}...")
                        pages = rag.load_document(temp_file_path)
                        chunks = rag.chunk_document(pages)

                        if chunks:
                            print(f"Adding {len(chunks)} chunks from {file_name} to ChromaDB...")
                            # Add chunks to ChromaDB with user ID and filename metadata
                            rag.add_documents_to_chroma(
                                chunks=chunks,
                                user_id=user.id,
                                source_filename=file_name
                            )
                            processed_files_count += 1

                            # 5. Record the filename in PostgreSQL if it's new for this user
                            existing_doc = db.query(models.Document).filter(
                                models.Document.owner_id == user.id,
                                models.Document.original_filename == file_name
                            ).first()
                            if not existing_doc:
                                new_doc_record = models.Document(original_filename=file_name, owner_id=user.id)
                                db.add(new_doc_record)
                                db.commit() # Commit after each successful file to save progress
                                print(f"Recorded '{file_name}' in PostgreSQL.")
                            else:
                                print(f"'{file_name}' already recorded in PostgreSQL.")
                        else:
                            print(f"Skipping '{file_name}' as no chunks were generated (empty or unparsable).")
                            failed_files_info.append(f"{file_name} (empty/unparsable)")
                    else:
                        print(f"Skipping '{file_name}' due to download failure.")
                        failed_files_info.append(f"{file_name} (download failed)")

                except Exception as file_processing_error:
                    # Catch errors during processing of a single file
                    print(f"Error processing file {file_name} (ID: {file_id}): {file_processing_error}")
                    failed_files_info.append(f"{file_name} (processing error: {file_processing_error})")
                    # Rollback potential DB changes for this specific file
                    db.rollback()
                finally:
                    # 6. Clean up the individual temporary file immediately after processing
                    if temp_file_path and os.path.exists(temp_file_path):
                        try:
                            os.remove(temp_file_path)
                            print(f"Cleaned up temp file: {temp_file_path}")
                        except OSError as cleanup_error:
                             print(f"Error cleaning up temp file {temp_file_path}: {cleanup_error}")
            # The 'with tempfile.TemporaryDirectory' context manager automatically cleans up the directory

        # Log and return the final status of the sync operation
        print(f"Sync completed for user {user.email}. Processed: {processed_files_count}, Failed: {len(failed_files_info)}")
        return {
            "status": "success",
            "message": f"Sync completed. Processed {processed_files_count} files.",
            "processed_count": processed_files_count,
            "failed_files": failed_files_info # List failed filenames and reasons
        }

    except ValueError as auth_error: # Catch specific auth errors from get_drive_service
        print(f"Authentication error during sync for user {user.email}: {auth_error}")
        # Reraise as HTTPException for the API endpoint to handle
        # Ensure status is imported from fastapi
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(auth_error))
    except HTTPException as http_exc: # Catch specific HTTPExceptions if raised internally
         print(f"HTTP Exception during sync: {http_exc.detail}")
         raise http_exc # Re-raise it
    except Exception as e:
        # Catch any other unexpected errors during the overall sync process
        print(f"General error during sync for user {user.email}: {e}")
        # Ensure rollback in case of error outside the file loop
        db.rollback()
        # Reraise as HTTPException
        # Ensure status is imported from fastapi
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Sync failed unexpectedly: {str(e)}")