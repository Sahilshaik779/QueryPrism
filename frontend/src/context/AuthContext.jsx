// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react'; // Import useEffect
import apiClient from '../api/apiClient.js'; // Use .js if you renamed it

// 1. Create the Context
const AuthContext = createContext();

// Get token from local storage
const initialToken = localStorage.getItem('token');

// --- THIS IS THE FIX ---
// If a token was found, set it on apiClient *immediately*
if (initialToken) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}
// --- END FIX ---

// 2. Create the Provider
export function AuthProvider({ children }) {
  // Store the token in state
  const [token, setToken] = useState(initialToken);

  const login = async (email, password) => {
    // ... (rest of your login function is unchanged)
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await apiClient.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const newAuthToken = response.data.access_token;
    setToken(newAuthToken);
    localStorage.setItem('token', newAuthToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAuthToken}`;
  };

  const logout = () => {
    // ... (rest of your logout function is unchanged)
    setToken(null);
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  };

  // 3. The value we'll provide
  const value = {
    token,
    login,
    logout,
    isAuthenticated: !!token, 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. Create a custom hook
export function useAuth() {
  return useContext(AuthContext);
}