// src/App.jsx
import './App.css';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import LoginPage from './pages/LoginPage.jsx'; // Ensure correct extension
import RegisterPage from './pages/RegisterPage.jsx'; // Ensure correct extension
import ChatPage from './pages/ChatPage.jsx'; // Ensure correct extension
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'; // Ensure correct extension
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';   // Ensure correct extension
import ProtectedRoute from './components/ProtectedRoute.jsx'; // Ensure correct extension
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext.jsx'; // Ensure correct extension

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTokenAndRedirect } = useAuth(); // Function from AuthContext

  // Effect to capture the token from URL fragment after Google OAuth redirect
  useEffect(() => {
    const hash = location.hash;
    if (hash.startsWith('#token=')) {
      const tokenFromUrl = hash.substring(7);
      if (tokenFromUrl) {
        console.log("OAuth Token found in URL fragment:", tokenFromUrl);
        // Save the token using AuthContext function and redirect to home
        setTokenAndRedirect(tokenFromUrl);
        // Clean the URL fragment after processing
        navigate(location.pathname, { replace: true, state: {} }); // Clear state and hash
      }
    }
  }, [location, navigate, setTokenAndRedirect]); // Dependencies

  return (
    <div className="App">
      {/* Toast component needs to be rendered for notifications */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* Define application routes */}
      <Routes>
        {/* Main chat page - protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        {/* Authentication pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        {/* Reset password page - no token parameter needed for this demo flow */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </div>
  )
}

export default App;