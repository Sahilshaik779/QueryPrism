# backend/app/core/rag.py

import os
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI

# --- NEW IMPORTS ---
# We no longer need 'RetrievalQA'
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Import the centralized settings
from .config import settings

# --- Document Loading (UNCHANGED) ---
def load_document(file_path: str):
    print(f"Loading document from: {file_path}")
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif ext == ".docx":
        loader = Docx2txtLoader(file_path)
    elif ext == ".csv":
        loader = CSVLoader(file_path, encoding="utf-8")
    else:
        raise ValueError(f"Unsupported file type: {ext}")
    return loader.load()

# --- Text Chunking (UNCHANGED) ---
def chunk_document(pages, chunk_size=1000, chunk_overlap=200):
    print("Chunking document...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        is_separator_regex=False,
    )
    return text_splitter.split_documents(pages)

# --- Embeddings (UNCHANGED) ---
def get_embedding_function():
    print("Loading embedding model...")
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# --- Vector Store (UNCHANGED) ---
def create_vector_store(chunks):
    print("Creating vector store...")
    embeddings = get_embedding_function()
    return FAISS.from_documents(chunks, embedding=embeddings)

def load_vector_store(store_path: str):
    if not os.path.exists(store_path):
        raise FileNotFoundError(f"Vector store not found at path: {store_path}")
    print(f"Loading vector store from: {store_path}")
    embeddings = get_embedding_function()
    return FAISS.load_local(
        store_path, 
        embeddings, 
        allow_dangerous_deserialization=True
    )

# --- Q&A Chain (HEAVILY UPDATED) ---
# --- Q&A Chain (HEAVILY UPDATED) ---
def create_qa_chain(vector_store):
    """
    Creates the RetrievalQA chain using the modern LCEL approach.
    This bypasses the need for the 'langchain.chains' module.
    """
    print("Creating Q&A chain with Gemini (LCEL)...")
    
    # 1. Initialize the LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-pro-latest",  # <-- THIS IS THE FIX
        google_api_key=settings.GOOGLE_API_KEY,
        convert_system_message_to_human=True
    )
    
    # 2. Get the retriever
    retriever = vector_store.as_retriever()

    # 3. Create the prompt template
    template = """
    You are an assistant for question-answering tasks. 
    Use the following pieces of retrieved context to answer the question. 
    If you don't know the answer, just say that you don't know. 
    Keep the answer concise.

    Context: {context} 

    Question: {question} 

    Answer:
    """
    
    prompt = PromptTemplate.from_template(template)

    # 4. Create the chain using LCEL "pipe" syntax
    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return chain