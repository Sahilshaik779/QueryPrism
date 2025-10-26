// src/components/FileUpload.jsx
import React, { useState, useRef } from 'react';
import apiClient from '../api/apiClient.js'; // Adjust extension if needed
import toast from 'react-hot-toast';

function FileUpload({ onUploadSuccess }) {
  // State to hold the currently selected file object
  const [selectedFile, setSelectedFile] = useState(null);
  // State to track if an upload is currently in progress
  const [isLoading, setIsLoading] = useState(false);
  // Ref to access the file input element directly (for clearing)
  const fileInputRef = useRef(null);

  // Handler for when the user selects a file using the input
  const handleFileChange = (e) => {
    const file = e.target.files[0]; // Get the first selected file
    if (file) {
      // Basic client-side check for allowed MIME types (more robust than extensions)
      const allowedTypes = [
        'application/pdf',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload PDF, DOCX, or CSV.');
        // Clear the invalid selection from the input
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedFile(null); // Clear the state
        return; // Stop further processing
      }
      // If file type is valid, update the state
      setSelectedFile(file);
      console.log("File selected:", file.name); // Debug log
    } else {
      // If user cancels file selection, clear the state
      setSelectedFile(null);
    }
  };

  // Handler for when the user clicks the "Upload & Add" button
  const handleUpload = async () => {
    // Prevent upload if no file is selected
    if (!selectedFile) {
        toast.error("Please select a file first.");
        return;
    };

    console.log("Upload button clicked. Starting upload..."); // Debug log
    setIsLoading(true); // Set loading state to true
    // Show a loading toast notification
    const loadingToastId = toast.loading(`Processing "${selectedFile.name}"...`);

    // Create FormData object to send the file
    const formData = new FormData();
    formData.append('file', selectedFile); // Append the file with the key 'file'

    try {
      // Make the POST request to the backend upload endpoint
      // The auth token is automatically included by the apiClient instance (from AuthContext)
      await apiClient.post('/api/rag/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, // Important header for file uploads
      });

      console.log("Upload API call successful."); // Debug log
      // Update the toast notification to show success
      toast.success(`"${selectedFile.name}" processed!`, { id: loadingToastId });
      // Call the callback function passed from the parent (ChatPage) with the filename
      onUploadSuccess(selectedFile.name);

      // Reset the component state after successful upload
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the file input visually

    } catch (err) {
       console.error("Upload failed:", err); // Log the full error for debugging
       // Determine the error message to show the user
       const errorMsg = err.response?.data?.detail || 'File upload failed. Please try again.';
       // Update the toast notification to show the error
       toast.error(errorMsg, { id: loadingToastId });

       // Reset the component state even on error
       setSelectedFile(null);
       if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
       // Always set loading state back to false after the operation completes
       console.log("Upload process finished. Setting isLoading to false."); // Debug log
       setIsLoading(false);
    }
  };

  // Render the component UI
  return (
    // Use React Fragment shorthand <>...</> as top-level element
    <>
      <div className="file-upload-container">
        <h3>Upload New Document</h3>
        <input
          type="file"
          onChange={handleFileChange} // Call handler when a file is chosen
          accept=".pdf,.docx,.csv" // Suggest correct file types to the browser
          ref={fileInputRef} // Attach ref to the input element
          className="file-input"
          disabled={isLoading} // Disable input while uploading
        />
        <button
          onClick={handleUpload} // Call handler when button is clicked
          // Disable button if loading or if no file is currently selected
          disabled={isLoading || !selectedFile}
          className="upload-button"
        >
          {/* Change button text based on loading state */}
          {isLoading ? 'Processing...' : 'Upload & Add'}
        </button>
        {/* Toast notifications handle success/error messages */}
      </div>

      {/* --- STYLED JSX --- */}
      <style jsx>{`
        .file-upload-container {
          margin-bottom: 1.5rem; /* Space below this component */
        }
        .file-upload-container h3 {
          font-size: 1.05rem; /* Match sidebar headers */
          margin-bottom: 0.75rem;
          color: #495057; /* Slightly muted color */
          font-weight: 600; /* Medium bold */
        }
        .file-input {
          display: block; /* Ensure it takes full width */
          width: 100%; /* Explicit full width */
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: #495057;
          /* Style file input - browser differences make this tricky */
          /* Consider using a label styled as a button technique for better cross-browser styling */
        }
        .file-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .upload-button {
          width: 100%;
          padding: 0.7rem; /* Match other sidebar buttons */
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid #007bff; /* Primary color border */
          background-color: #e7f3ff; /* Lighter primary background */
          color: #007bff; /* Primary color text */
          border-radius: 6px; /* Use global button radius */
          /* Inherits transition, cursor from global button styles */
        }
        .upload-button:hover:not(:disabled) {
          background-color: #cfe7ff; /* Slightly darker on hover */
        }
         .upload-button:disabled {
            /* Inherits disabled styles from global button */
            background-color: #e9ecef !important; /* Specific override if needed */
            border-color: #ced4da !important;
            color: #6c757d !important;
        }
      `}</style>
      {/* --- END STYLED JSX --- */}
    </>
  );
}

export default FileUpload;