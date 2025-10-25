import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient.js'; 
import toast from 'react-hot-toast';

function ResetPasswordPage() {
  const location = useLocation(); // Hook to access location state
  const navigate = useNavigate();

  // State for email (received from previous page), passwords, and loading
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      // If no email is found (e.g., direct navigation), show error and redirect
      toast.error("No email specified. Please start from the 'Forgot Password' page.");
      navigate('/forgot-password'); // Redirect back to request page
    }
  }, [location.state, navigate]); 


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
        toast.error("Email is missing. Please go back.");
        return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setIsLoading(true); 

    try {
      
      await apiClient.post('/api/auth/reset-password', {
        email: email, 
        new_password: newPassword
      });
      
      toast.success("Password reset successfully! Please log in.");
      navigate('/login');

    } catch (err) {
      // Show error toast
      toast.error(err.response?.data?.detail || "Failed to reset password.");
      setIsLoading(false); // Stop loading indicator only on error
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Set New Password</h2>
        {/* Display the email for confirmation */}
        <p>Setting a new password for: <strong>{email || '...'}</strong></p>

        {/* New Password Input */}
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
        {/* Confirm Password Input */}
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
          className="auth-button"
          disabled={isLoading || !email} // Disable if loading or no email
        >
          {isLoading ? 'Resetting...' : 'Set New Password'}
        </button>

        {/* Link back to Login */}
        <p className="auth-switch" style={{marginTop: '2rem'}}>
          <Link to="/login">Back to Login</Link>
        </p>
      </form>
    </div>
  );
}

export default ResetPasswordPage;