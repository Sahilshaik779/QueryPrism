# backend/app/core/config.py
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    GOOGLE_API_KEY: str = "YOUR_DEFAULT_KEY"
    VECTOR_STORE_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'vector_stores')
    
    # --- JWT Settings ---
    SECRET_KEY: str = "YOUR_DEFAULT_SECRET"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 1 day

    # --- Database Settings (NEW) ---
    DATABASE_URL: str = "postgresql://user:password@localhost/queryprism"

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()