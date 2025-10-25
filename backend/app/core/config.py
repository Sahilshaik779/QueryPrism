from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    GOOGLE_API_KEY: str = "DEFAULT_KEY"

    VECTOR_STORE_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'chroma_db')


    # --- JWT Settings ---
    SECRET_KEY: str = "DEFAULT_SECRET"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 1 day

    # --- Database Settings ---
    DATABASE_URL: str = "postgresql://user:password@localhost/queryprism"

    # --- Google OAuth Settings ---
    GOOGLE_CLIENT_ID: str = "DEFAULT_CLIENT_ID"
    GOOGLE_CLIENT_SECRET: str = "DEFAULT_CLIENT_SECRET"
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()