// src/App.jsx
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Toaster } from 'react-hot-toast'; // Import Toaster
import { useAuth } from './context/AuthContext.jsx';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTokenAndRedirect } = useAuth();

  // Effect to capture token from Google OAuth redirect
  useEffect(() => {
    const hash = location.hash;
    if (hash.startsWith('#token=')) {
      const tokenFromUrl = hash.substring(7);
      if (tokenFromUrl) {
        setTokenAndRedirect(tokenFromUrl);
        navigate('/', { replace: true, state: {} });
      }
    }
  }, [location, navigate, setTokenAndRedirect]);

  return (
    <div className="App">
      {/* Ensures toast notifications can be rendered anywhere */}
      <Toaster position="top-center" reverseOrder={false} />

      <Routes>
        <Route path="/" element={ <ProtectedRoute> <ChatPage /> </ProtectedRoute> } />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>

      {/* Global styles */}
      <style jsx global>{`
        /* --- Keep your global styles here --- */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { margin: 0; font-family: 'Inter', sans-serif; background-color: #f8f9fa; color: #212529; font-size: 16px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;}
        *, *::before, *::after { box-sizing: border-box; }
        a { color: #007bff; text-decoration: none; } a:hover { text-decoration: underline; }
        button { font-family: inherit; cursor: pointer; border: none; border-radius: 6px; padding: 0.65rem 1.25rem; font-size: 0.95rem; transition: all 0.2s ease; }
        button:disabled { cursor: not-allowed; opacity: 0.6; }
        .form-group { margin-bottom: 1.25rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; font-size: 0.9rem; }
        .form-group input { width: 100%; padding: 0.75rem 0.85rem; border: 1px solid #ced4da; border-radius: 6px; font-size: 1rem; background-color: #fff; color: #495057; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .form-group input:focus { outline: none; border-color: #80bdff; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
        hr { border: none; border-top: 1px solid #dee2e6; margin: 1.5rem 0; }
        .error-message { color: #dc3545; text-align: center; margin-top: 1rem; font-size: 0.9rem; }
        .success-message { color: #28a745; text-align: center; margin-top: 1rem; font-size: 0.9rem; }
      `}</style>
    </div>
  )
}
export default App;