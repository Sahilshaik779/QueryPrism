from fastapi import FastAPI
from contextlib import asynccontextmanager

from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.routes import router as rag_router
from app.database import engine, Base 

# Create all database tables 
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application startup...")
    yield
    # Code to run on shutdown
    print("Application shutdown...")

app = FastAPI(
    title="QueryPrism API",
    description="A stateless RAG API with PostgreSQL and user authentication.",
    version="4.0.0",
    lifespan=lifespan 
)

# MIDDLEWARE 
origins = [
    "http://localhost:5173",  
    "http://localhost:3000",  
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       
    allow_credentials=True,      
    allow_methods=["*"],         
    allow_headers=["*"],       
)



#routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(rag_router, prefix="/api/rag", tags=["RAG"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the QueryPrism API v4!"}