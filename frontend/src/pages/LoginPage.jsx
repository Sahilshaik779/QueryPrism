// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; 
import toast from 'react-hot-toast'; 

function LoginPage() {
  // --- Hooks ---
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const { login } = useAuth();

  // --- Handlers ---

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setIsLoading(true); 

    try {
      // Call the login function from AuthContext with email and password
      await login(formData.email, formData.password);
      // On successful login, navigate to the main chat page ('/')
      navigate('/');
    } catch (err) {
      // If login fails, show an error toast message
      const errorMsg = err.response?.data?.detail || 'Login failed. Please check credentials.';
      toast.error(errorMsg);
      setIsLoading(false); // Stop loading indicator on error
    }
  };

  // Handles the "Log in with Google" button click
  const handleGoogleLogin = () => {
    // Redirect the browser to the backend endpoint that starts the Google OAuth flow
    window.location.href = 'http://localhost:8000/api/auth/google/login'; // Adjust backend URL if necessary
  };

  // --- Render ---
  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>

        {/* Email Input Field */}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email" // Must match key in formData state
            value={formData.email} // Controlled input
            onChange={handleChange} // Update state on change
            required // HTML5 validation
            disabled={isLoading} // Disable while loading
          />
        </div>

        {/* Password Input Field */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password" // Must match key in formData state
            value={formData.password} // Controlled input
            onChange={handleChange} // Update state on change
            required // HTML5 validation
            disabled={isLoading} // Disable while loading
          />
        </div>

        {/* Forgot Password Link */}
        <div className="forgot-password-link">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {/* Standard Login Button */}
        <button
          type="submit"
          className="auth-button"
          disabled={isLoading} // Disable button while loading
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {/* Divider */}
        <div className="divider">OR</div>

        {/* Google Login Button */}
        <button
          type="button" // Important: Prevent default form submission
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={isLoading} // Disable if standard login is processing
        >
          {/* Consider adding a Google Icon SVG here */}
          Log in with Google
        </button>

        {/* Link to Registration Page */}
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;