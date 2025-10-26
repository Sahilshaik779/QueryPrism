# backend/app/schemas.py

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

# --- Document Schemas ---

class QueryRequest(BaseModel):
    """Schema for legacy single-document query (potentially deprecated)."""
    query: str
    document_id: str

class UploadResponse(BaseModel):
    """Response schema after uploading a document."""
    document_id: str # Represents processed file, e.g., "processed_filename.pdf"
    message: str

class QueryResponse(BaseModel):
    """Response schema for a RAG query."""
    answer: str

class UserQueryRequest(BaseModel):
    """Request schema for querying across all user documents."""
    query: str

# --- User & Auth Schemas ---

class UserBase(BaseModel):
    """Base schema for user, containing email."""
    email: EmailStr

class UserCreate(UserBase):
    """Schema for creating a new user."""
    full_name: str
    password: str = Field(..., min_length=8) # Ensure minimum length

    @field_validator('password')
    @classmethod
    def validate_password_bcrypt(cls, v: str) -> str:
        """Validate password byte length for bcrypt compatibility."""
        byte_length = len(v.encode('utf-8'))
        if byte_length > 72:
            raise ValueError(f'Password exceeds maximum 72 bytes ({byte_length} bytes found).')
        return v

class User(UserBase):
    """Schema representing a user in API responses."""
    id: int
    full_name: str
    is_active: bool

    class Config:
        from_attributes = True # Enable ORM mode compatibility

class Token(BaseModel):
    """Schema for the JWT access token response."""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Schema for data embedded within the JWT token."""
    email: Optional[str] = None

# --- Password Reset Schemas ---

class ForgotPasswordRequest(BaseModel):
    """Request schema for initiating password reset."""
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    """Request schema for setting a new password."""
    email: EmailStr
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    @classmethod
    def validate_password_bcrypt(cls, v: str) -> str:
        """Validate new password byte length for bcrypt compatibility."""
        byte_length = len(v.encode('utf-8'))
        if byte_length > 72:
            raise ValueError(f'Password exceeds maximum 72 bytes ({byte_length} bytes found).')
        return v

class SimpleResponse(BaseModel):
    """Generic success message response."""
    message: str

class ForgotPasswordResponse(BaseModel):
    """Response schema for the simplified forgot password flow."""
    message: str

# --- Google Drive Schemas ---

class SetFolderRequest(BaseModel):
    """Request schema for setting the Google Drive Folder ID."""
    folder_id: str