from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime 

class User(Base):
    """SQLAlchemy model for the 'users' table."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True) 

    # Relationship remains the same: a user has many document records
    documents = relationship("Document", back_populates="owner")

class Document(Base):
    """
    SQLAlchemy model for the 'documents' table.
    Now primarily tracks which original files a user has uploaded.
    The actual vector data is in ChromaDB, linked via metadata (user_id).
    """
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # We store the original filename for display purposes
    original_filename = Column(String, nullable=False, index=True) 
    
    # Track when the document was processed
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign key linking to the 'users' table
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="documents")
