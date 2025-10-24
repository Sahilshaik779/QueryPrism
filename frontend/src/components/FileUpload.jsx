// src/components/FileUpload.jsx
import React, { useState, useRef } from 'react'; // Import useRef
import apiClient from '../api/apiClient.js';

function FileUpload({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- NEW: Ref for the file input ---
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    // ... (start of function is unchanged)
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await apiClient.post('/api/rag/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setIsLoading(false);
      setSuccess(`File '${selectedFile.name}' processed!`);
      
      // --- NEW: Clear the input ---
      setSelectedFile(null); // Clear the selected file state
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset the input field
      }
      // --- END NEW ---

      onUploadSuccess(response.data.document_id);

    } catch (err) {
      // ... (error handling is unchanged)
       setIsLoading(false);
       setSelectedFile(null); // Also clear on error
       if (fileInputRef.current) {
          fileInputRef.current.value = ""; 
       }
       if (err.response && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('File upload failed. Please try again.');
      }
    }
  };

  return (
    <div className="file-upload-container">
      <h3>1. Upload a Document</h3>
      <input 
        type="file" 
        onChange={handleFileChange} 
        accept=".pdf,.docx,.csv" 
        ref={fileInputRef} // <-- Assign the ref
      />
      <button onClick={handleUpload} disabled={isLoading || !selectedFile}> {/* Disable if no file */}
        {isLoading ? 'Processing...' : 'Upload'}
      </button>
      
      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}

      <hr />
      <h3>2. Ask a Question</h3>
    </div>
  );
}

export default FileUpload;