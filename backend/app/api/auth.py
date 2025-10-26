# backend/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import uuid
import os

# Import security functions (including verify_password and get_password_hash)
from app.core.security import (
    create_access_token,
    verify_password,
    get_password_hash,
    # create_password_reset_token # Not needed for simplified flow
)
# Import database session getter
from app.database import get_db
# Import database models (User) and Pantic schemas
from app import models, schemas
# Import application settings
from app.core.config import settings

# --- Router Setup ---
router = APIRouter()

# --- Google OAuth Configuration ---
# WARNING: Allows HTTP for local dev. Remove in production (HTTPS required).
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Configuration dictionary for Google OAuth flow
CLIENT_SECRETS_DICT = {
    "web": {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        "javascript_origins": ["http://localhost:5173"] # Match your frontend origin
    }
}

# Scopes requested from Google during OAuth
SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    # --- ENSURE ONLY READONLY IS HERE ---
    'https://www.googleapis.com/auth/drive.readonly' 
    # --- REMOVE drive.file ---
]

# --- Standard Authentication Endpoints ---

@router.post("/register", response_model=schemas.User)
async def register(
    form_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """Handles new user registration."""
    db_user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    hashed_password = get_password_hash(form_data.password)
    new_user = models.User(
        email=form_data.email,
        full_name=form_data.full_name,
        hashed_password=hashed_password,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Handles standard email/password login and returns a JWT."""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Google OAuth Endpoints ---

@router.get("/google/login")
async def google_login(request: Request):
    """Redirects the user to Google's authentication page."""
    flow = Flow.from_client_config(
        client_config=CLIENT_SECRETS_DICT,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline', # Request offline access to get refresh_token
        include_granted_scopes='true',
        prompt='consent' # Force consent screen to ensure refresh_token
    )
    # Storing state in session is recommended for production CSRF protection
    # request.session['state'] = state
    return RedirectResponse(authorization_url)

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handles the redirect from Google after user consent."""
    # Production CSRF check:
    # state = request.query_params.get('state')
    # if not state or state != request.session.get('state'):
    #     raise HTTPException(status_code=400, detail="Invalid state parameter")

    code = request.query_params.get('code')
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    # Re-initialize the Flow object with scopes for token fetching
    flow = Flow.from_client_config(
        client_config=CLIENT_SECRETS_DICT,
        scopes=SCOPES, # This was the missing argument
        redirect_uri=settings.GOOGLE_REDIRECT_URI
    )

    try:
        # Exchange the authorization code for credentials
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Verify the ID token to get user information securely
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        user_email = id_info.get('email')
        user_name = id_info.get('name', 'Google User') # Use 'name' from profile scope

        if not user_email:
            raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

        # --- ADD DETAILED LOGGING ---
        print("-" * 20)
        print("Google Callback Processing:")
        print(f"Received ID Token for: {user_email}")
        print(f"Credentials object obtained: {credentials}") # Log the whole object (might be verbose)
        print(f"Does credentials have refresh token? {'Yes' if credentials.refresh_token else 'No'}")
        # --- END LOGGING ---

        # Find existing user or create a new one
        user = db.query(models.User).filter(models.User.email == user_email).first()
        token_updated = False # Flag to track if DB commit is needed for tokens

        if not user:
            # Create user with a random unusable password
            random_password = str(uuid.uuid4())
            hashed_password = get_password_hash(random_password)
            user = models.User(
                email=user_email,
                full_name=user_name,
                hashed_password=hashed_password,
                is_active=True
            )
            # Save refresh token (usually only provided on first auth)
            if credentials.refresh_token:
                user.google_refresh_token = credentials.refresh_token
                # --- ADD LOGGING ---
                print(f"!!! SAVING NEW refresh token for NEW user {user_email}: {credentials.refresh_token[:10]}...") # Log first 10 chars
                # --- END LOGGING ---
            if credentials.expiry: # Store expiry of the access token (optional)
                user.google_token_expiry = credentials.expiry.replace(tzinfo=timezone.utc)
            db.add(user)
            token_updated = True
            print(f"Created new user via Google OAuth: {user_email}")
        else:
             print(f"User logged in via Google OAuth: {user_email}")
             if not user.is_active:
                 raise HTTPException(status_code=400, detail="User account is inactive")
             # Update refresh token if a new one is provided and different
             if credentials.refresh_token and user.google_refresh_token != credentials.refresh_token:
                 # --- ADD LOGGING ---
                 print(f"!!! UPDATING refresh token for EXISTING user {user_email}: {credentials.refresh_token[:10]}...") # Log first 10 chars
                 # --- END LOGGING ---
                 user.google_refresh_token = credentials.refresh_token; token_updated = True
             # Update expiry if provided and different (optional)
             if credentials.expiry and user.google_token_expiry != credentials.expiry.replace(tzinfo=timezone.utc):
                 user.google_token_expiry = credentials.expiry.replace(tzinfo=timezone.utc); token_updated = True

        # Commit changes if tokens were added/updated
        if token_updated:
            try:
                print("Attempting to commit token changes to DB...")
                db.commit()
                db.refresh(user) # Refresh to get latest state including ID if new user
                print("DB commit successful.")
            except Exception as db_err:
                print(f"!!! DB Commit FAILED: {db_err}")
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to save credentials.")

        # --- ADD LOGGING ---
        # Check token directly from the user object *after* potential commit
        db.refresh(user) # Ensure we have latest data from DB
        print(f"User object in DB google_refresh_token: {user.google_refresh_token[:10] if user.google_refresh_token else 'None'}")
        print("-" * 20)
        # --- END LOGGING ---

        # Generate the application's JWT for the authenticated user
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        app_access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )

        # Redirect back to frontend with app's JWT in URL fragment (#)
        frontend_redirect_url = f"http://localhost:5173/#token={app_access_token}" # Adjust URL if needed
        response = RedirectResponse(frontend_redirect_url)
        return response

    except Exception as e:
        print(f"Error during Google OAuth callback: {e}")
        # Consider more specific error handling (e.g., token fetch failure)
        raise HTTPException(status_code=500, detail=f"Authentication failed during Google callback.")

# --- Simplified Password Reset Endpoints (DEMO ONLY - INSECURE) ---

@router.post("/forgot-password", response_model=schemas.ForgotPasswordResponse)
async def forgot_password_simple(
    request: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """Checks if user exists (DEMO VERSION). Does not send email."""
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        print(f"Password reset requested for non-existent email: {request.email}")

    # No token generation needed for this simple flow
    print(f"Password reset requested for: {request.email}")
    return {
        "message": "Password reset request processed. Proceed to reset password."
    }

@router.post("/reset-password", response_model=schemas.SimpleResponse)
async def reset_password_simple(
    request: schemas.ResetPasswordRequest, # Uses schema with email, new_password
    db: Session = Depends(get_db)
):
    """Resets password directly based on email (DEMO VERSION - INSECURE)."""
    user = db.query(models.User).filter(models.User.email == request.email).first()

    if not user:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email not found.",
        )

    if not user.is_active:
         raise HTTPException(status_code=400, detail="Inactive user cannot reset password.")

    # Check: Prevent using the same password
    if verify_password(request.new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the current password.",
        )

    # Update password and clear any old reset tokens
    user.hashed_password = get_password_hash(request.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    print(f"Password reset successfully for: {user.email}")
    return {"message": "Password has been reset successfully."}