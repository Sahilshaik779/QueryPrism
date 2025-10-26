// src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient.js'; // Adjust extension if needed
import toast from 'react-hot-toast';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate(); // Hook for navigation

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call backend to process forgot password request
      await apiClient.post('/api/auth/forgot-password', { email });
      // Show success and navigate to reset page (passing email via state)
      toast.success("Request processed. Please set your new password.");
      navigate('/reset-password', { state: { email: email } });
    } catch (err) {
      // Show error toast if request fails
      toast.error(err.response?.data?.detail || "Failed to process request.");
      setIsLoading(false); // Stop loading only on error
    }
    // No 'finally' block needed as navigation occurs on success
  };

  return (
    // Apply styles using plain class names defined in <style jsx>
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        <p className="instruction-text">Enter your account's email address to proceed with resetting your password.</p>

        {/* Email Input Field - Uses global .form-group style */}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email} // Controlled input
            onChange={(e) => setEmail(e.target.value)} // Update state on change
            required // HTML5 validation
            disabled={isLoading} // Disable input while loading
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="auth-button primary" // Add primary class for styling
          disabled={isLoading} // Disable button while loading
        >
          {isLoading ? 'Processing...' : 'Proceed to Reset'}
        </button>

        {/* Link back to Login */}
        <p className="auth-switch">
          Remembered your password? <Link to="/login">Login</Link>
        </p>
      </form>

      {/* --- STYLED JSX --- */}
      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          /* Background from global styles */
        }
        .auth-form {
          background: #fff;
          padding: 2.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          width: 100%;
          max-width: 420px;
        }
        h2 {
          text-align: center;
          margin-top: 0;
          margin-bottom: 1rem; /* Reduced margin */
          color: #343a40;
        }
        .instruction-text {
            text-align: center;
            font-size: 0.95rem;
            color: #6c757d;
            margin-bottom: 2rem;
        }

        /* Uses global .form-group styles */

        .auth-button {
          width: 100%;
          font-weight: 600;
          /* Inherits padding, border-radius etc from global button styles */
        }
        .auth-button.primary {
          background-color: #007bff;
          color: white;
        }
        .auth-button.primary:hover:not(:disabled) {
          background-color: #0056b3;
        }
        /* Inherits disabled styles from global button styles */

        .auth-switch {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.95rem;
          color: #6c757d;
        }
        .auth-switch a {
          font-weight: 500;
          /* Inherits link color/hover from global styles */
        }

        /* Inherits global .error-message style if needed via toast */
      `}</style>
      {/* --- END STYLED JSX --- */}
    </div>
  );
}

export default ForgotPasswordPage;