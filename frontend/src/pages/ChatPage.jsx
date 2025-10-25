import React, { useState, useEffect, useRef } from 'react';
import LogoutButton from '../components/LogoutButton.jsx';
import FileUpload from '../components/FileUpload.jsx';
import DocumentList from '../components/DocumentList.jsx';
import apiClient from '../api/apiClient.js';

function ChatPage() {
  // --- State ---
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! Upload a document or ask a question about your existing documents.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Refs ---
  const messagesEndRef = useRef(null);
  const documentListRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); 

  // --- Handlers ---
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputValue };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    setInputValue('');
    setIsLoading(true);

    try {
      // Make the API call to the backend query endpoint
      const response = await apiClient.post('/api/rag/query', {
        query: userMessage.content, 
      });
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

      setIsLoading(false);
    }
  };

  // Callback function passed to FileUpload, triggered on successful upload
  const handleUploadSuccess = (fileName) => {

    setMessages((prevMessages) => [...prevMessages,
        { role: 'assistant', content: `"${fileName}" processed and added to your knowledge base.` }
    ]);
    // Call the 'refresh' method on the DocumentList component via its ref
    if (documentListRef.current) {
      documentListRef.current.refresh();
    }
  };

  // --- Render ---
  return (
    <div className="chat-page">
      {/* Top navigation bar */}
      <nav className="navbar">
         <h2>QueryPrism 📄</h2>
         <LogoutButton />
      </nav>

      {/* Main content area */}
      <div className="main-content">
        {/* Left Sidebar */}
        <aside className="sidebar">
          {/* File upload component, passing the success handler */}
          <FileUpload onUploadSuccess={handleUploadSuccess} />
          <hr />
          {/* Document list component, attaching the ref */}
          <DocumentList ref={documentListRef} />
        </aside>

        {/* Right Chat Area */}
        <main className="chat-container">
           {/* Message display area, applies 'loading' class for dimming */}
           <div className={`message-list ${isLoading ? 'loading' : ''}`}>
            {/* Iterate over the messages array to display each chat bubble */}
            {messages.map((msg, index) => (
              <div key={index} className={`message message-${msg.role}`}>
                {/* Split message content by newlines to render paragraphs */}
                {msg.content.split('\n').map((line, i) => (
                  <p key={i} style={{ marginBlockStart: '0em', marginBlockEnd: '0em' }}>{line || '\u00A0'}</p>
                ))}
              </div>
            ))}
            {/* Display the "Thinking..." indicator while loading */}
             {isLoading && (
              <div className="message message-assistant loading-indicator">
                <span>Thinking</span><span>.</span><span>.</span><span>.</span>
              </div>
            )}
            {/* Invisible element used as the target for scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area at the bottom */}
          <div className="chat-input-area">
             <input
               type="text"
               placeholder="Ask anything about your documents..."
               disabled={isLoading}
               value={inputValue} 
               onChange={(e) => setInputValue(e.target.value)} 
               // Handle Enter key press for sending message
               onKeyPress={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault(); 
                   handleSendMessage(); 
                 }
               }}
             />
             <button
               onClick={handleSendMessage} 
               disabled={isLoading} 
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