import React, { useState, useEffect, useRef } from 'react';
import LogoutButton from '../components/LogoutButton.jsx';
import FileUpload from '../components/FileUpload.jsx';
import DocumentList from '../components/DocumentList.jsx'; 
import apiClient from '../api/apiClient.js'; 

function ChatPage() {
  // State for messages, input value, and loading status
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! Upload a document or ask a question about your existing documents.' } 
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs for auto-scrolling and triggering document list refresh
  const messagesEndRef = useRef(null);
  const documentListRef = useRef(null); 

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to handle sending a query to the backend
  const handleSendMessage = async () => {
    // Prevent sending empty messages or while already loading
    if (!inputValue.trim() || isLoading) return; 

    // Create the user's message object
    const userMessage = { role: 'user', content: inputValue };
    // Add user's message to the chat display immediately
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    // Clear the input field and set loading state
    setInputValue('');
    setIsLoading(true);

    try {
      // Send the query to the backend API (no document_id needed)
      const response = await apiClient.post('/api/rag/query', {
        query: userMessage.content,
      });
      // Create the assistant's response object
      const assistantMessage = { role: 'assistant', content: response.data.answer };
      // Add assistant's message to the chat display
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (err) {
      console.error("Error querying document:", err);
      // Add an error message to the chat if the API call fails
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again.' 
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function called by FileUpload component upon successful upload
  const handleUploadSuccess = (fileName) => { 

    setMessages((prevMessages) => [...prevMessages, 
        { role: 'assistant', content: `"${fileName}" processed and added to your knowledge base.` }
    ]);

    if (documentListRef.current) {
      documentListRef.current.refresh(); 
    }
  };

  // Render the Chat Page UI
  return (
    <div className="chat-page">
      {/* Top Navigation Bar */}
      <nav className="navbar">
         <h2>QueryPrism 📄</h2> {/* Added an icon */}
         <LogoutButton />
      </nav>

      {/* Main Content Area (Sidebar + Chat) */}
      <div className="main-content">
        {/* Sidebar Section */}
        <aside className="sidebar">
          {/* File Upload Component */}
          <FileUpload onUploadSuccess={handleUploadSuccess} /> 
          
          <hr /> {/* Separator */}

          {/* Document List Component */}
          <DocumentList ref={documentListRef} /> 
        </aside>

        {/* Main Chat Window Section */}
        <main className="chat-container">
          {/* List of Messages */}
           <div className="message-list">
            {/* Map through the messages array and render each message */}
            {messages.map((msg, index) => ( 
              <div key={index} className={`message message-${msg.role}`}>
                <p>{msg.content}</p>
              </div> 
            ))}
            {/* Display loading indicator when waiting for response */}
            {isLoading && ( 
              <div className="message message-assistant loading-indicator">
                <span>Thinking</span><span>.</span><span>.</span><span>.</span>
              </div> 
            )}
            {/* Empty div used as a target for auto-scrolling */}
            <div ref={messagesEndRef} /> 
          </div>

          {/* Chat Input Area at the Bottom */}
          <div className="chat-input-area">
             <input 
               type="text" 
               placeholder="Ask anything about your documents..." 
               disabled={isLoading} // Disable input while loading
               value={inputValue} // Bind input value to state
               onChange={(e) => setInputValue(e.target.value)} // Update state when typing
               // Allow sending message by pressing Enter
               onKeyPress={(e) => { 
                 if (e.key === 'Enter' && !e.shiftKey) { // Check for Enter key (not Shift+Enter)
                   e.preventDefault(); // Prevent adding a newline
                   handleSendMessage(); // Send the message
                 } 
               }} 
             />
             <button 
               onClick={handleSendMessage} // Send message on button click
               disabled={isLoading} // Disable button while loading
             > 
               Send 
             </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ChatPage;