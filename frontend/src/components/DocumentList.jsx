import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import apiClient from '../api/apiClient.js';
import toast from 'react-hot-toast'; 

const DocumentList = forwardRef((props, ref) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState(null);


  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/rag/documents');
      setDocuments(response.data); 
    } catch (err) {
      console.error("Error fetching documents:", err);
      toast.error("Could not load document list."); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []); 
  useImperativeHandle(ref, () => ({ refresh: fetchDocuments }));

  const handleDelete = async (filename) => {
    if (!window.confirm(/* ... confirmation message ... */ `Are you sure you want to delete "${filename}"? This will remove its data from your knowledge base.`)) {
      return;
    }

    setDeletingFilename(filename); 
    // setError(null); 
    const loadingToastId = toast.loading(`Deleting "${filename}"...`); // Show loading toast

    try {
      const encodedFilename = encodeURIComponent(filename);
      await apiClient.delete(`/api/rag/documents/${encodedFilename}`);

      toast.success(`"${filename}" deleted.`, { id: loadingToastId }); 
      fetchDocuments(); 

    } catch (err) {
      console.error(`Error deleting document "${filename}":`, err);
      let errorMsg = `Failed to delete "${filename}".`;
       if (err.response && err.response.data.detail) {
         errorMsg = err.response.data.detail;
       }
      toast.error(errorMsg, { id: loadingToastId }); // Update on error
    } finally {
      setDeletingFilename(null); 
    }
  };

  return (
    <div className="document-list-container">
      <h3>Your Knowledge Base</h3>
      {isLoading && <p>Loading...</p>} 
      {/* Remove local error display */}
      {/* {error && <p className="error-message">{error}</p>} */} 
      {!isLoading && documents.length === 0 && ( /* Removed !error check */
        <p>No documents processed yet.</p>
      )}
      {!isLoading && documents.length > 0 && ( /* Removed !error check */
        <ul className="doc-ul">
          {documents.map((filename, index) => (
            <li key={index}>
              <span>{filename}</span>
              <button
                onClick={() => handleDelete(filename)}
                disabled={deletingFilename === filename} 
                className="delete-button"
                title={`Delete ${filename}`}
              >
                {deletingFilename === filename ? '...' : '🗑️'} {/* Simplified deleting text */}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={fetchDocuments} disabled={isLoading || !!deletingFilename} className="refresh-button">
        Refresh List
      </button>
    </div>
  );
});

export default DocumentList;