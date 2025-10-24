# app.py (Final Version for Phase 3)

import streamlit as st
import requests

# --- Page Configuration ---
st.set_page_config(page_title="QueryPrism", page_icon="📄")

# --- Backend API URL ---
BACKEND_URL = "http://127.0.0.1:8000"


# --- UI Components ---
st.title("📄 QueryPrism: Conversational Document Analysis")

with st.sidebar:
    st.header("1. Upload Your Document")
    uploaded_file = st.file_uploader(
        "Upload your document",
        type=['pdf', 'docx', 'csv'],
        accept_multiple_files=False
    )
    st.header("2. How It Works")
    st.info(
        """
        This app uses a Retrieval-Augmented Generation (RAG) pipeline
        to answer questions about your documents.
        """
    )

# --- Session State Initialization ---
# This is to store the chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# This is to track if a document has been successfully uploaded
if "doc_ready" not in st.session_state:
    st.session_state.doc_ready = False

# --- Main App Logic ---

# Handle file upload
if uploaded_file is not None:
    # Check if this is a new file
    if not st.session_state.doc_ready:
        with st.spinner(f"Processing '{uploaded_file.name}'..."):
            files = {'file': (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
            try:
                response = requests.post(f"{BACKEND_URL}/upload", files=files)
                if response.status_code == 200:
                    st.sidebar.success("Document processed successfully!")
                    st.session_state.doc_ready = True
                    # Clear previous chat history on new upload
                    st.session_state.messages = []
                else:
                    st.sidebar.error(f"Error: {response.json().get('detail')}")
                    st.session_state.doc_ready = False
            except requests.exceptions.RequestException:
                st.sidebar.error("Connection Error: Could not connect to the backend.")
                st.session_state.doc_ready = False

# Display chat messages from history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Accept user input
if prompt := st.chat_input("Ask a question about your document..."):
    if not st.session_state.doc_ready:
        st.warning("Please upload a document first.")
    else:
        # Add user message to chat history
        st.session_state.messages.append({"role": "user", "content": prompt})
        # Display user message in chat message container
        with st.chat_message("user"):
            st.markdown(prompt)

        # Display AI response in chat message container
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    response = requests.post(f"{BACKEND_URL}/query", json={"query": prompt})
                    if response.status_code == 200:
                        answer = response.json().get("answer")
                        st.markdown(answer)
                        # Add AI response to chat history
                        st.session_state.messages.append({"role": "assistant", "content": answer})
                    else:
                        st.error(f"Error: {response.json().get('detail')}")
                except requests.exceptions.RequestException:
                    st.error("Connection Error: Could not connect to the backend.")