// src/pages/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react'; // Import useEffect, useRef
import LogoutButton from '../components/LogoutButton.jsx';
import FileUpload from '../components/FileUpload.jsx';
import apiClient from '../api/apiClient.js';

function ChatPage() {
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! Please upload a document to get started.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- NEW: Ref for the message list ---
  const messagesEndRef = useRef(null);

  // --- NEW: Function to scroll to bottom ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- NEW: useEffect to scroll when messages change ---
  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Dependency array: run when messages state updates

  const handleSendMessage = async () => {
    // ... (rest of handleSendMessage is unchanged)
    if (!inputValue.trim() || isLoading || !activeDocumentId) return;
    const userMessage = { role: 'user', content: inputValue };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/rag/query', {
        query: userMessage.content,
        document_id: activeDocumentId,
      });
      const assistantMessage = { role: 'assistant', content: response.data.answer };
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (err) {
      console.error("Error querying document:", err);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUploadSuccess = (docId) => {
    // ... (rest of handleUploadSuccess is unchanged)
    setActiveDocumentId(docId);
    setMessages([
        { role: 'assistant', content: 'Your document is ready! Ask a question.' }
    ]);
  };

  return (
    <div className="chat-page">
      <nav className="navbar">
        <h2>QueryPrism</h2>
        <LogoutButton />
      </nav>

      <div className="main-content">
        <aside className="sidebar">
          {/* We'll update FileUpload in the next step */}
          <FileUpload onUploadSuccess={handleUploadSuccess} /> 
        </aside>

        <main className="chat-container">
          <div className="message-list">
            {messages.map((msg, index) => (
              <div key={index} className={`message message-${msg.role}`}>
                <p>{msg.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="message message-assistant loading-indicator"> {/* Add class */}
                 {/* Better loading dots */}
                <span>Thinking</span><span>.</span><span>.</span><span>.</span>
              </div>
            )}
            {/* --- NEW: Empty div at the end to scroll to --- */}
            <div ref={messagesEndRef} /> 
          </div>
          
          <div className="chat-input-area">
            {/* ... (input and button are unchanged) ... */}
             <input 
              type="text" 
              placeholder="Ask a question..." 
              disabled={!activeDocumentId || isLoading}
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); 
                  handleSendMessage();
                }
              }}
            />
            <button 
              onClick={handleSendMessage} 
              disabled={!activeDocumentId || isLoading}
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