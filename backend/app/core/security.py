# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.core.config import settings
from app.schemas import TokenData
from typing import Optional
import bcrypt # <-- Import bcrypt directly

# --- Password Hashing (Using bcrypt) ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    # We must encode both to bytes for bcrypt
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    # Hash the password and decode the result back to a string
    hashed_bytes = bcrypt.hashpw(
        password.encode('utf-8'), 
        bcrypt.gensalt()
    )
    return hashed_bytes.decode('utf-8')

# --- JWT Token Handling (Unchanged) ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return TokenData(email=email)
    except JWTError:
        return None