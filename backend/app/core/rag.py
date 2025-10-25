import os
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_chroma import Chroma 

from app.vector_db import get_chroma_client, get_chroma_collection_name, get_chroma_collection_object
from app.core.embeddings import embedding_function_instance 


from app.core.config import settings
import uuid 

def load_document(file_path: str):
    print(f"Loading document from: {file_path}")
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    if ext == ".pdf": loader = PyPDFLoader(file_path)
    elif ext == ".docx": loader = Docx2txtLoader(file_path)
    elif ext == ".csv": loader = CSVLoader(file_path, encoding="utf-8")
    else: raise ValueError(f"Unsupported file type: {ext}")
    return loader.load()

def chunk_document(pages, chunk_size=1000, chunk_overlap=200):
    print("Chunking document...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap,
        length_function=len, is_separator_regex=False,
    )
    return text_splitter.split_documents(pages)

# Add Documents to ChromaDB 
def add_documents_to_chroma(chunks, user_id: int, source_filename: str):
    """
    Adds document chunks to the persistent ChromaDB collection
    using the low-level client, bypassing Langchain's add_documents wrapper.
    """
    print(f"Adding {len(chunks)} chunks to ChromaDB for user {user_id} from {source_filename} via low-level client...")

    # 1. Get low-level collection object
    chroma_collection = get_chroma_collection_object()

    # 2. Preparing metadata 
    metadatas = [
        {"user_id": str(user_id), "source_filename": source_filename}
        for _ in chunks
    ]

    # 3. Prepare the document texts
    documents = [chunk.page_content for chunk in chunks]

    # 4. Prepare unique IDs 
    ids = [str(uuid.uuid4()) for _ in chunks] 

    # 5. Add directly to the collection
    print(f"Calling chroma_collection.add() with {len(documents)} documents...") 
    chroma_collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    print("Chunks added successfully using low-level collection.add().")


# Create Q&A Chain  
def create_qa_chain(user_id: int):
    print(f"Creating Q&A chain for user {user_id} with Gemini (LCEL)...")
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-pro-latest",
        google_api_key=settings.GOOGLE_API_KEY,
        convert_system_message_to_human=True
    )
    
    vector_store = Chroma(
        client=get_chroma_client(),
        collection_name=get_chroma_collection_name(),
        embedding_function=embedding_function_instance, 
        persist_directory=settings.VECTOR_STORE_DIR
    )

    retriever = vector_store.as_retriever(
        search_kwargs={'filter': {'user_id': str(user_id)}} 
    )

    template = """
    You are an assistant for question-answering tasks. 
    Use the following pieces of retrieved context from the user's documents to answer the question. 
    If you don't know the answer based on the context, just say that you don't know. 
    Keep the answer concise.

    Context: {context} 

    Question: {question} 

    Answer:
    """
    prompt = PromptTemplate.from_template(template)
    
    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return chain