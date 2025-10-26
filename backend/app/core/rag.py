# backend/app/core/rag.py

import os
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_chroma import Chroma # LangChain's Chroma wrapper
import uuid # For generating IDs when adding to collection

# Import ChromaDB client/name and embedding function instance
from app.vector_db import get_chroma_client, get_chroma_collection_name
from app.core.embeddings import embedding_function_instance # Import the instance
# Import centralized settings
from app.core.config import settings

## Document Loading & Chunking
# =============================

def load_document(file_path: str):
    """
    Loads a document (PDF, DOCX, CSV) from the given file path.
    """
    print(f"Loading document from: {file_path}")
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif ext == ".docx":
        loader = Docx2txtLoader(file_path)
    elif ext == ".csv":
        loader = CSVLoader(file_path, encoding="utf-8") # Specify encoding for CSV
    else:
        # Raise error for unsupported types
        raise ValueError(f"Unsupported file type: {ext}")
    return loader.load()

def chunk_document(pages, chunk_size=1000, chunk_overlap=200):
    """
    Splits loaded document pages into smaller, overlapping chunks.
    Using RecursiveCharacterTextSplitter by default.
    Consider experimenting with chunk_size and chunk_overlap for optimal retrieval.
    """
    print(f"Chunking document with size={chunk_size}, overlap={chunk_overlap}...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        is_separator_regex=False, # Use default separators like "\n\n", "\n", " ", ""
    )
    return text_splitter.split_documents(pages)

## Vector Store Interaction (ChromaDB)
# ====================================

def add_documents_to_chroma(chunks, user_id: int, source_filename: str):
    """
    Adds document chunks to the persistent ChromaDB collection
    using the low-level client. Ensures user_id is stored as a string.
    """
    print(f"Adding {len(chunks)} chunks to ChromaDB for user {user_id} from {source_filename} via low-level client...")

    # Import here if needed to avoid potential top-level circular imports during init
    from app.vector_db import get_chroma_collection_object
    chroma_collection = get_chroma_collection_object()

    # Prepare metadata list, ensuring user_id is a string
    metadatas = [
        {"user_id": str(user_id), "source_filename": source_filename}
        for _ in chunks
    ]

    # Extract page content from Langchain Document objects
    documents = [chunk.page_content for chunk in chunks]

    # Generate unique IDs for each chunk (required by ChromaDB .add)
    ids = [str(uuid.uuid4()) for _ in chunks]

    # Add data directly to the ChromaDB collection object
    # The collection handles embedding internally using the function it was initialized with.
    print(f"Calling chroma_collection.add() with {len(documents)} documents...")
    chroma_collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    print("Chunks added successfully using low-level collection.add().")

## RAG Chain Creation
# ====================

def create_qa_chain(user_id: int):
    """
    Creates the complete RAG Question-Answering chain using LCEL.
    1. Initializes the LLM (Gemini).
    2. Initializes the Chroma vector store wrapper for retrieval.
    3. Creates a retriever filtered specifically for the given user_id.
    4. Defines a strict prompt template enforcing context-based answers.
    5. Assembles the chain using LangChain Expression Language (LCEL).
    """
    print(f"Creating Q&A chain for user {user_id}...") # Log the user ID

    # 1. Initialize the LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-pro-latest", # Or consider "gemini-1.5-flash-latest"
        google_api_key=settings.GOOGLE_API_KEY,
        convert_system_message_to_human=True, # Helps with compatibility
        temperature=0.1 # Lower temperature for more factual, less creative answers
    )

    # 2. Initialize LangChain Chroma wrapper (needed for the retriever interface)
    vector_store = Chroma(
        client=get_chroma_client(),
        collection_name=get_chroma_collection_name(),
        embedding_function=embedding_function_instance, # Use the shared instance
        persist_directory=settings.VECTOR_STORE_DIR # Should match client init path
    )

    # 3. Create the retriever with user filtering and increased k
    user_filter = {'user_id': str(user_id)} # Ensure user_id is string
    retrieved_chunk_count = 8 # Number of chunks to retrieve
    print(f"Applying retriever filter: {user_filter}, retrieving top {retrieved_chunk_count} chunks.")

    retriever = vector_store.as_retriever(
        search_kwargs={
            'filter': user_filter,
            'k': retrieved_chunk_count # Retrieve more chunks for better context
        }
        # Consider adding different search types if needed:
        # search_type="mmr" # Max Marginal Relevance for diverse results
    )

    # 4. Define the strict prompt template
    template = """
    **Instructions:**
    1. You are an assistant specialized in answering questions based *solely* on the provided document excerpts (Context).
    2. Carefully examine the Context provided below.
    3. Answer the user's Question using *only* the information found in the Context. Do not use any prior knowledge.
    4. If the Question asks for specific details (like names, numbers, dates, values, places), provide the exact information from the Context if present.
    5. If the answer is explicitly stated in the Context, provide it directly. Quote relevant parts if helpful but keep the answer concise.
    6. If the answer is implied but not explicitly stated, state what the context implies carefully, making it clear it's an implication.
    7. **Crucially:** If the answer cannot be found *anywhere* within the given Context, you MUST respond exactly with: "Based on the provided documents, I cannot answer that question." Do not attempt to guess, synthesize, or provide related information not present in the Context.

    **Context:**
    {context}

    **Question:** {question}

    **Answer:**
    """
    prompt = PromptTemplate.from_template(template)

    # 5. Define the LCEL Chain structure
    # RunnablePassthrough takes the initial input (query string) and passes it along.
    # The dictionary maps 'context' and 'question' for the prompt.
    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser() # Parses the LLM's message content into a string
    )

    print("Q&A chain created successfully.")
    return chain