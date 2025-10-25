import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient.js'; 
import toast from 'react-hot-toast';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.post('/api/auth/forgot-password', { email });
      toast.success("Request processed. Please set your new password.");
      navigate('/reset-password', { state: { email: email } });
    } catch (err) {
      // Show error toast
      toast.error(err.response?.data?.detail || "Failed to process request.");
      setIsLoading(false); // Stop loading only on error
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        <p>Enter your account's email address to proceed with resetting your password.</p>

        {/* Email Input */}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="auth-button"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Proceed to Reset'}
        </button>

        {/* Link back to Login */}
        <p className="auth-switch">
          Remembered your password? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;