from langchain_huggingface import HuggingFaceEmbeddings

def get_embedding_function():
    """Gets the embedding model from Hugging Face."""
    print("Loading embedding model (if not already loaded)...")
    # small, fast, and effective open-source model
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

embedding_function_instance = get_embedding_function()