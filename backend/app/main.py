# backend/app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager

# --- IMPORT THIS ---
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.routes import router as rag_router
from app.database import engine, Base # Import Base and engine

# --- Create all database tables ---
# This line tells SQLAlchemy to create all tables defined in models.py
# that inherit from Base.
Base.metadata.create_all(bind=engine)

# --- Lifespan Event (Optional but good practice) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    print("Application startup...")
    # You could add DB connection checks here
    yield
    # Code to run on shutdown
    print("Application shutdown...")

# --- App Creation ---
app = FastAPI(
    title="QueryPrism API",
    description="A stateless RAG API with PostgreSQL and user authentication.",
    version="4.0.0",
    lifespan=lifespan # Add the lifespan event
)

# --- ADD THIS MIDDLEWARE ---
# This list defines which "origins" (websites) are allowed
# to make requests to your backend.
origins = [
    "http://localhost:5173",  # Your Vite frontend
    "http://localhost:3000",  # (In case you use Create React App)
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Allows specific origins
    allow_credentials=True,      # Allows cookies/auth headers
    allow_methods=["*"],         # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],         # Allows all headers
)
# --- END MIDDLEWARE ---


# Include the routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(rag_router, prefix="/api/rag", tags=["RAG"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the QueryPrism API v4!"}