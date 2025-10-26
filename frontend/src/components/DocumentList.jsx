// src/components/DocumentList.jsx
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import apiClient from '../api/apiClient.js';
import toast from 'react-hot-toast';

const DocumentList = forwardRef((props, ref) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState(null); // Tracks which file is being deleted

  // Fetch documents from backend
  const fetchDocuments = async () => {
    console.log("Fetching documents..."); // Debug log
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/rag/documents');
      setDocuments(response.data);
      console.log("Documents fetched:", response.data); // Debug log
    } catch (err) {
      console.error("Error fetching documents:", err);
      toast.error("Could not load document list.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []); // Fetch on mount

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({ refresh: fetchDocuments }));

  // Handle document deletion
  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete "${filename}"? Its data will be removed.`)) return;

    console.log(`Attempting to delete: ${filename}`); // Debug log
    setDeletingFilename(filename); // Disable button for this file
    const loadingToastId = toast.loading(`Deleting "${filename}"...`);

    try {
      const encodedFilename = encodeURIComponent(filename);
      await apiClient.delete(`/api/rag/documents/${encodedFilename}`);
      console.log(`Delete API call successful for: ${filename}`); // Debug log
      toast.success(`"${filename}" deleted.`, { id: loadingToastId });
      fetchDocuments(); // Refresh the list automatically

    } catch (err) {
      console.error(`Error deleting document "${filename}":`, err);
      const errorMsg = err.response?.data?.detail || `Failed to delete "${filename}".`;
      toast.error(errorMsg, { id: loadingToastId });
    } finally {
      setDeletingFilename(null); // Re-enable button
    }
  };

  return (
    <>
      <div className="doc-list-container">
        <h3>Your Knowledge Base</h3>
        {isLoading && <p className="loading-text">Loading...</p>}
        {!isLoading && documents.length === 0 && (
          <p className="empty-text">No documents processed yet.</p>
        )}
        {!isLoading && documents.length > 0 && (
          <ul className="doc-ul">
            {documents.map((filename, index) => (
              <li key={index}>
                <span className="filename">{filename}</span>
                <button
                  onClick={() => handleDelete(filename)} // Ensure onClick is attached
                  // Button disabled if this specific file is being deleted
                  disabled={deletingFilename === filename}
                  className="delete-button"
                  title={`Delete ${filename}`}
                >
                  {deletingFilename === filename ? '...' : '🗑️'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={fetchDocuments}
          // Button disabled if loading list OR if any file is being deleted
          disabled={isLoading || !!deletingFilename}
          className="refresh-button"
        >
          Refresh List
        </button>
      </div>

      <style jsx>{`
        .doc-list-container { margin-top: 1.5rem; }
        h3 { font-size: 1.05rem; margin-bottom: 0.75rem; color: #495057; font-weight: 600; }
        .loading-text, .empty-text { font-size: 0.9rem; color: #6c757d; padding: 1rem 0; text-align: center; }
        .doc-ul { list-style: none; padding: 0; margin: 0 0 1rem 0; max-height: 250px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 6px; }
        li { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.85rem; border-bottom: 1px solid #dee2e6; font-size: 0.9rem; color: #343a40; }
        li:last-child { border-bottom: none; }
        .filename { flex-grow: 1; margin-right: 0.5rem; word-break: break-all; }
        .delete-button { background: none; border: none; color: #dc3545; cursor: pointer; padding: 0.2rem; font-size: 1rem; line-height: 1; opacity: 0.6; transition: opacity 0.2s; flex-shrink: 0; }
        .delete-button:hover { opacity: 1; }
        .delete-button:disabled { cursor: not-allowed; opacity: 0.4; color: #adb5bd; }
        .refresh-button { width: 100%; padding: 0.7rem; font-size: 0.9rem; font-weight: 500; border: 1px solid #ced4da; background-color: #f8f9fa; color: #495057; border-radius: 6px; margin-top: 0.5rem; }
        .refresh-button:hover:not(:disabled) { background-color: #e9ecef; }
        .refresh-button:disabled { /* Uses global disabled style */ }
      `}</style>
    </>
  );
});
export default DocumentList;