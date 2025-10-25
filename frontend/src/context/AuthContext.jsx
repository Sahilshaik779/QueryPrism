import React, { createContext, useState, useContext } from 'react';
import apiClient from '../api/apiClient.js';


const AuthContext = createContext();
const initialToken = localStorage.getItem('token');

if (initialToken) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(initialToken);


  // Saves the token and updates the API client header
  const saveToken = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    console.log("Token saved and apiClient header updated.");
  };


  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const response = await apiClient.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    saveToken(response.data.access_token); 
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  };


  // Specifically for handling the redirect from OAuth
  const setTokenAndRedirect = (tokenFromUrl, path) => {
    saveToken(tokenFromUrl);
    // Navigation is handled in App.jsx now using useNavigate
  };

  const value = {
    token,
    login,
    logout,
    saveToken, 
    setTokenAndRedirect, // Export the new function
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}