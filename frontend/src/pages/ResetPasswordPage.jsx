// src/pages/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient.js'; // Adjust extension if needed
import toast from 'react-hot-toast';

function ResetPasswordPage() {
  const location = useLocation(); // Hook to access location state (passed from ForgotPasswordPage)
  const navigate = useNavigate();

  // State for email (received), passwords, and loading indicator
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect to retrieve the email passed via location state
  // Redirects back if no email is found (prevents direct access)
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      toast.error("Invalid access. Please start from the 'Forgot Password' page.");
      navigate('/forgot-password'); // Redirect back to request page
    }
  }, [location.state, navigate]); // Dependencies ensure this runs if state changes

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Basic validation
    if (!email) {
        toast.error("Email is missing. Please go back.");
        return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setIsLoading(true); // Start loading indicator

    try {
      // Call the simplified backend endpoint with email and new password
      await apiClient.post('/api/auth/reset-password', {
        email: email, // Send email
        new_password: newPassword
      });
      // Show success toast and redirect to login
      toast.success("Password reset successfully! Please log in.");
      navigate('/login');

    } catch (err) {
      // Show error toast
      toast.error(err.response?.data?.detail || "Failed to reset password.");
      setIsLoading(false); // Stop loading indicator only on error
    }
    // No 'finally' block needed as navigation occurs on success
  };

  return (
    // Apply styles using plain class names defined in <style jsx>
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Set New Password</h2>
        {/* Display the email for confirmation */}
        <p className="instruction-text">
          Setting a new password for: <strong>{email || '...'}</strong>
        </p>

        {/* New Password Input Field - Uses global .form-group style */}
        <div className="form-group">
          <label htmlFor="newPassword">New Password (min 8 chars)</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength="8"
            disabled={isLoading || !email} // Disable if loading or no email
          />
        </div>
        {/* Confirm Password Input Field - Uses global .form-group style */}
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength="8"
            disabled={isLoading || !email} // Disable if loading or no email
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="auth-button primary" // Add primary class for styling
          disabled={isLoading || !email} // Disable if loading or no email
        >
          {isLoading ? 'Resetting...' : 'Set New Password'}
        </button>

        {/* Link back to Login */}
        <p className="auth-switch">
          <Link to="/login">Back to Login</Link>
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
        .instruction-text strong {
            color: #495057; /* Slightly darker email */
            word-break: break-all; /* Wrap long emails */
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
          margin-top: 2rem; /* More space above back link */
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

export default ResetPasswordPage;