# core.py (Updated for API use)

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaLLM as Ollama # Updated import
from langchain.chains import RetrievalQA

def load_document(file_path):
    """Loads a PDF document from the given file path."""
    print("Loading document...")
    loader = PyPDFLoader(file_path)
    return loader.load()

def chunk_document(pages, chunk_size=1000, chunk_overlap=200):
    """Splits the document pages into smaller chunks."""
    print("Chunking document...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        is_separator_regex=False,
    )
    return text_splitter.split_documents(pages)

def create_vector_store(chunks):
    """Creates a FAISS vector store from the document chunks."""
    print("Creating vector store...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return FAISS.from_documents(chunks, embedding=embeddings)

def create_qa_chain(vector_store, model_name="mistral"):
    """Creates the RetrievalQA chain."""
    print(f"Creating Q&A chain with model: {model_name}")
    llm = Ollama(model=model_name)
    retriever = vector_store.as_retriever()
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True
    )
    return qa_chain