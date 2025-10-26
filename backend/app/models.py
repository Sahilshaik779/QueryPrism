from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base

from datetime import datetime, timedelta

class User(Base):

    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    reset_token = Column(String, unique=True, index=True, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)

    # ---  Google OAuth Token Fields ---
    google_refresh_token = Column(Text, nullable=True) 
    google_token_expiry = Column(DateTime(timezone=True), nullable=True) # Track expiry of access token 
    
    # --- Drive Folder ID Field ---
    drive_folder_id = Column(String, nullable=True, index=True) # Store the selected folder ID


    documents = relationship("Document", back_populates="owner")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String, nullable=False, index=True) 
    uploaded_at = Column(DateTime, default=datetime.utcnow) # This is naive, might change later if needed
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="documents")