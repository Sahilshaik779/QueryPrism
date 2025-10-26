// src/components/LogoutButton.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; // Adjust extension if needed

function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect after logout
  };

  return (
    <>
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>

      {/* --- STYLED JSX --- */}
      <style jsx>{`
        .logout-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px; /* Match global style */
          background-color: #dc3545; /* Bootstrap danger red */
          color: white;
          font-weight: 500; /* Slightly less bold */
          font-size: 0.9rem; /* Slightly smaller */
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .logout-button:hover {
          background-color: #c82333; /* Darker red on hover */
        }
        .logout-button:disabled { /* Add disabled style if needed */
          background-color: #e9ecef !important;
          color: #6c757d !important;
          cursor: not-allowed;
          opacity: 0.65;
        }
      `}</style>
      {/* --- END STYLED JSX --- */}
    </>
  );
}

export default LogoutButton;