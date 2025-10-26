// src/pages/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import LogoutButton from '../components/LogoutButton.jsx'; // Adjust extension if needed
import FileUpload from '../components/FileUpload.jsx';   // Adjust extension if needed
import DocumentList from '../components/DocumentList.jsx'; // Adjust extension if needed
import apiClient from '../api/apiClient.js'; // Adjust extension if needed
import toast from 'react-hot-toast';

function ChatPage() {
  // --- State ---
  // messages: Array to hold the chat history objects ({ role: 'user'/'assistant', content: '...' })
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! Upload a document or ask a question about your existing documents.' }
  ]);
  // inputValue: Tracks the text currently typed in the chat input field
  const [inputValue, setInputValue] = useState('');
  // isLoading: Boolean flag for chat query API calls
  const [isLoading, setIsLoading] = useState(false);
  // driveFolderId: Tracks the text in the Google Drive Folder ID input
  const [driveFolderId, setDriveFolderId] = useState('');
  // isSavingFolder: Boolean flag for the Save Folder ID API call
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  // isSyncing: Boolean flag for the Drive sync API call
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Refs ---
  // messagesEndRef: Ref attached to an empty div at the bottom of the message list for auto-scrolling
  const messagesEndRef = useRef(null);
  // documentListRef: Ref to the DocumentList component to call its 'refresh' method externally
  const documentListRef = useRef(null);

  // --- Effects ---
  // Scrolls the chat window to the bottom whenever the 'messages' array updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Dependency array ensures this runs only when messages change

  // --- Handlers ---
  // Function triggered when the user sends a message
  const handleSendMessage = async () => {
    // Basic validation: Don't send if input is empty or a request is already in progress
    if (!inputValue.trim() || isLoading) return;

    // Optimistic UI update: Add user's message immediately
    const userMessage = { role: 'user', content: inputValue };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Clear input and set loading state
    setInputValue('');
    setIsLoading(true);

    try {
      // Make the API call to the backend query endpoint
      const response = await apiClient.post('/api/rag/query', {
        query: userMessage.content, // Send only the query text
      });
      // Add the assistant's response to the chat
      const assistantMessage = { role: 'assistant', content: response.data.answer };
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (err) {
      console.error("Error querying document:", err);
      // Add a user-friendly error message to the chat on failure
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      // Ensure loading state is always turned off after the API call finishes
      setIsLoading(false);
    }
  };

  // Callback function passed to FileUpload, triggered on successful upload
  const handleUploadSuccess = (fileName) => {
    // Add a confirmation message to the chat history
    setMessages((prevMessages) => [...prevMessages,
        { role: 'assistant', content: `"${fileName}" processed and added to your knowledge base.` }
    ]);
    // Call the 'refresh' method on the DocumentList component via its ref
    if (documentListRef.current) {
      documentListRef.current.refresh();
    }
  };

  // Handles saving the Google Drive Folder ID entered by the user
  const handleSaveFolderId = async () => {
      if (!driveFolderId.trim()) {
          toast.error("Please enter a Google Drive Folder ID.");
          return;
      }
      setIsSavingFolder(true); // Indicate saving process started
      try {
          // Send the folder ID to the backend API endpoint
          await apiClient.post('/api/rag/drive/folder', { folder_id: driveFolderId }); // Ensure API path matches routes.py
          toast.success("Folder ID saved successfully!");
          // Optionally clear the input field after successful save
          // setDriveFolderId('');
      } catch (err) {
          // Show error toast if saving fails
          toast.error(err.response?.data?.detail || "Failed to save Folder ID.");
      } finally {
          // Stop the saving indicator
          setIsSavingFolder(false);
      }
  };

  // Handles triggering the Google Drive sync process
  const handleSyncDrive = async () => {
    setIsSyncing(true); // Start loading indicator
    const syncToastId = toast.loading("Starting Google Drive sync..."); // Show initial loading toast

    try {
      // Call the backend sync endpoint
      const response = await apiClient.post('/api/rag/drive/sync');

      // Update toast with success message from backend
      toast.success(response.data.message || "Sync process finished.", { id: syncToastId });

      // Refresh the document list after sync completes
      if (documentListRef.current) {
        documentListRef.current.refresh();
      }

    } catch (err) {
      // Update toast with error message from backend or generic error
      const errorMsg = err.response?.data?.detail || "Google Drive sync failed.";
      toast.error(errorMsg, { id: syncToastId });
      console.error("Error during Drive sync:", err);
    } finally {
      setIsSyncing(false); // Stop loading indicator
    }
  };


  // --- Render ---
  return (
    // Applying plain class names for Styled JSX
    <div className="chat-page">
      <nav className="navbar">
         <h2>QueryPrism 📄</h2>
         <LogoutButton /> {/* Assumes LogoutButton styles itself */}
      </nav>

      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-content">
            <FileUpload onUploadSuccess={handleUploadSuccess} /> {/* Assumes FileUpload styles itself */}
            <hr />
            <DocumentList ref={documentListRef} /> {/* Assumes DocumentList styles itself */}
            <hr />
            <div className="drive-folder-container">
              <h3>Connect Google Drive Folder</h3>
              <p>Paste the ID of the Google Drive folder...</p>
              <small>Find the ID in the folder's URL...</small>
              <div className="form-group"> {/* Reusing global style */}
                   <label htmlFor="driveFolderId">Folder ID</label>
                   <input
                      type="text" id="driveFolderId" value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      placeholder="e.g., ..." disabled={isSavingFolder || isSyncing}
                   />
              </div>
              <button onClick={handleSaveFolderId} disabled={isSavingFolder || isSyncing || !driveFolderId.trim()} className="button save-folder">
                   {isSavingFolder ? 'Saving...' : 'Save Folder ID'}
              </button>
              <button onClick={handleSyncDrive} disabled={isSyncing || isSavingFolder} className="button sync-drive">
                {isSyncing ? 'Syncing Files...' : 'Sync Files from Drive'}
              </button>
            </div>
          </div>
        </aside>

        <main className="chat-container">
           {/* Added safety check before mapping messages */}
           <div className={`message-list ${isLoading ? 'loading' : ''}`}>
            {/* Check if messages is an array before mapping */}
            {Array.isArray(messages) && messages.map((msg, index) => (
              <div key={index} className={`message message-${msg.role}`}>
                {/* Render message content, splitting by newline */}
                {msg.content.split('\n').map((line, i) => (
                  <p key={i} style={{ marginBlockStart: '0em', marginBlockEnd: '0em' }}>{line || '\u00A0'}</p> // Use non-breaking space for empty lines
                ))}
              </div>
            ))}
             {/* Show loading indicator when isLoading is true */}
             {isLoading && (
              <div className="message message-assistant loading-indicator">
                <span>Thinking</span><span>.</span><span>.</span><span>.</span>
              </div>
            )}
             {/* Empty div for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input area */}
          <div className="chat-input-area">
             <input
               type="text"
               placeholder="Ask anything about your documents..."
               disabled={isLoading} // Disable input while loading
               value={inputValue} // Bind value to state
               onChange={(e) => setInputValue(e.target.value)} // Update state on change
               onKeyPress={(e) => { // Send message on Enter key press
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSendMessage();
                 }
               }}/>
             <button
               onClick={handleSendMessage} // Send message on button click
               disabled={isLoading} // Disable button while loading
               className="send-button"
             >
               Send
             </button>
          </div>
        </main>
      </div>

      {/* --- STYLED JSX for ChatPage --- */}
      <style jsx>{`
        /* --- Main Layout --- */
        .chat-page { display: flex; flex-direction: column; height: 100vh; width: 100vw; background-color: #f8f9fa; overflow: hidden; }
        /* --- Navbar --- */
        .navbar { display: flex; justify-content: space-between; align-items: center; padding: 0 1.5rem; height: 60px; background-color: #fff; border-bottom: 1px solid #dee2e6; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); flex-shrink: 0; }
        .navbar h2 { color: #343a40; margin: 0; font-weight: 600; }
        /* LogoutButton styles assumed external */
        /* --- Main Content Area --- */
        .main-content { display: flex; flex-grow: 1; overflow: hidden; }
        /* --- Sidebar --- */
        .sidebar { width: 320px; background-color: #fff; border-right: 1px solid #dee2e6; flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; }
        .sidebar-content { padding: 1.5rem; overflow-y: auto; flex-grow: 1; }
        /* hr style is global */
        /* FileUpload & DocumentList styles assumed external */
        /* Drive Folder Section */
        .drive-folder-container { margin-top: 1.5rem; padding-top: 1.5rem; }
        .drive-folder-container h3 { font-size: 1.05rem; margin-bottom: 0.5rem; color: #495057; font-weight: 600;}
        .drive-folder-container p { font-size: 0.9em; color: #6c757d; margin-bottom: 0.25rem; }
        .drive-folder-container small { font-size: 0.8em; color: #6c757d; display: block; margin-bottom: 1rem; }
        /* Reusing global .form-group style pattern */
        /* Sidebar Buttons */
        .button { width: 100%; padding: 0.7rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; transition: background-color 0.2s; margin-top: 0.75rem; font-weight: 500;}
        .save-folder { border: none; background-color: #28a745; color: white; } /* Green for save */
        .save-folder:hover:not(:disabled) { background-color: #218838; }
        .sync-drive { border: 1px solid #17a2b8; background-color: #e8f7fa; color: #17a2b8; } /* Info blue */
        .sync-drive:hover:not(:disabled) { background-color: #d1ecf1; }
        .button:disabled { background-color: #e9ecef !important; border-color: #ced4da !important; color: #6c757d !important; cursor: not-allowed; }
        /* --- Chat Container --- */
        .chat-container { flex-grow: 1; display: flex; flex-direction: column; background-color: #f8f9fa; overflow: hidden; }
        .message-list { flex-grow: 1; overflow-y: auto; padding: 1.5rem 2rem; }
        .message-list.loading { opacity: 0.7; }
        /* Chat Message Bubbles */
        .message { margin-bottom: 1rem; padding: 0.7rem 1.1rem; border-radius: 18px; line-height: 1.45; max-width: 75%; clear: both; word-wrap: break-word; }
        .message p { margin: 0 0 0.2rem 0; }
        .message p:last-child { margin-bottom: 0; }
        .message-assistant { background-color: #e9ecef; color: #212529; border-bottom-left-radius: 4px; float: left; }
        .message-user { background-color: #007bff; color: white; border-bottom-right-radius: 4px; float: right; margin-left: auto; }
        /* Loading Indicator */
        .loading-indicator span { animation: blink 1.4s infinite both; opacity: 0.2; }
        .loading-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .loading-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
        /* Chat Input Area */
        .chat-input-area { display: flex; padding: 1rem 1.5rem; border-top: 1px solid #dee2e6; background-color: #fff; flex-shrink: 0; align-items: center;}
        .chat-input-area input { flex-grow: 1; padding: 0.8rem 1rem; border: 1px solid #ced4da; border-radius: 20px; margin-right: 0.75rem; font-size: 1rem; }
        .chat-input-area input:focus { outline: none; border-color: #80bdff; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
        .chat-input-area button.send-button { padding: 0.8rem 1.25rem; border: none; border-radius: 20px; background-color: #007bff; color: white; font-weight: 500; cursor: pointer; transition: background-color 0.2s; flex-shrink: 0; font-size: 0.95rem; }
        .chat-input-area button.send-button:hover:not(:disabled) { background-color: #0056b3; }
        .chat-input-area button.send-button:disabled { background-color: #adb5bd; cursor: not-allowed; }
      `}</style>
      {/* --- END STYLED JSX BLOCK --- */}
    </div>
  );
}

export default ChatPage;