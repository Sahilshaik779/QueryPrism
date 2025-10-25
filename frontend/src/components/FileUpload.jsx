import React, { useState, useRef } from 'react';
import apiClient from '../api/apiClient.js';
import toast from 'react-hot-toast'; 

function FileUpload({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);

    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    const loadingToastId = toast.loading(`Processing "${selectedFile.name}"...`); // Show loading toast

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await apiClient.post('/api/rag/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(`"${selectedFile.name}" processed!`, { id: loadingToastId }); 
      
      onUploadSuccess(selectedFile.name); 

      setSelectedFile(null); 
      if (fileInputRef.current) fileInputRef.current.value = ""; 

    } catch (err) {
       let errorMsg = 'File upload failed. Please try again.';
       if (err.response && err.response.data.detail) {
         errorMsg = err.response.data.detail;
       }
       toast.error(errorMsg, { id: loadingToastId }); 
       
       setSelectedFile(null); 
       if (fileInputRef.current) fileInputRef.current.value = ""; 
    } finally {
       setIsLoading(false); 
    }
  };

  return (
    <div className="file-upload-container">
      <h3>Upload New Document</h3>
      <input 
        type="file" 
        onChange={handleFileChange} 
        accept=".pdf,.docx,.csv" 
        ref={fileInputRef}
      />
      <button onClick={handleUpload} disabled={isLoading || !selectedFile}>
        {/* Update button text slightly */}
        {isLoading ? 'Processing...' : 'Upload & Add'} 
      </button>
      
      {/* Remove local success/error messages */}
      {/* {success && <p className="success-message">{success}</p>} */}
      {/* {error && <p className="error-message">{error}</p>} */}
    </div>
  );
}

export default FileUpload;