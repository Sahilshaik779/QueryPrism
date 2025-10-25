from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

class QueryRequest(BaseModel):
    query: str
    document_id: str  

class UploadResponse(BaseModel):
    document_id: str
    message: str

class QueryResponse(BaseModel):
    answer: str

# User & Auth Schemas 
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    full_name: str
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def validate_password_bcrypt(cls, v: str) -> str:
        # Check maximum byte length for bcrypt compatibility
        byte_length = len(v.encode('utf-8'))
        if byte_length > 72:
            raise ValueError(f'Password is too long ({byte_length} bytes). Maximum is 72 bytes.')
        return v

class User(UserBase):
    id: int
    full_name: str
    is_active: bool

    class Config:
        from_attributes = True 

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserQueryRequest(BaseModel):
    """
    Pydantic model for the request body of the multi-document query endpoint.
    Only requires the query string.
    """
    query: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr 
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    @classmethod
    def validate_password_bcrypt(cls, v: str) -> str:
        byte_length = len(v.encode('utf-8'))
        if byte_length > 72:
            raise ValueError(f'Password is too long ({byte_length} bytes). Max 72 bytes.')
        return v


class SimpleResponse(BaseModel):
    message: str

class ForgotPasswordResponse(BaseModel): # Token removed
    message: str