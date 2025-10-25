
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // If the user is not authenticated, redirect to the login page
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child component 
  return children;
}

export default ProtectedRoute;