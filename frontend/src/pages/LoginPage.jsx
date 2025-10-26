// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; // Adjust extension if needed
import toast from 'react-hot-toast';

function LoginPage() {
  // State for form data and loading indicator
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from context

  // Update form data state on input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`); // Log input changes
    setFormData((prevData) => ({
      ...prevData,
      [name]: value // Update the specific field (email or password)
    }));
  };

  // Handle standard email/password form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page refresh
    console.log("Login form submitted with:", formData); // Log form data on submit
    setIsLoading(true);
    try {
      console.log("Calling login function from AuthContext...");
      await login(formData.email, formData.password);
      console.log("Login successful, navigating home.");
      navigate('/'); // Redirect on success
    } catch (err) {
      console.error("Login failed:", err); // Log the full error
      const errorMsg = err.response?.data?.detail || 'Login failed. Check credentials.';
      toast.error(errorMsg);
      setIsLoading(false); // Stop loading only on error
    }
    // No finally needed for isLoading = false on success due to navigation
  };

  // Handle Google Login button click
  const handleGoogleLogin = () => {
    console.log("Google Login button clicked. Redirecting..."); // Log button click
    // Redirect browser to backend endpoint to start OAuth flow
    // Ensure this URL is correct for your running backend
    window.location.href = 'http://localhost:8000/api/auth/google/login';
  };

  return (
    // Apply styles using plain class names defined in <style jsx>
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>

        {/* Email Input */}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email" // Should match key in formData state
            value={formData.email} // Controlled input - value comes from state
            onChange={handleChange} // **CRITICAL: Updates state when typing**
            required
            disabled={isLoading}
          />
        </div>

        {/* Password Input */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password" // Should match key in formData state
            value={formData.password} // Controlled input - value comes from state
            onChange={handleChange} // **CRITICAL: Updates state when typing**
            required
            disabled={isLoading}
          />
        </div>

        {/* Forgot Password Link */}
        <div className="forgot-password-link">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {/* Standard Login Button */}
        <button
            type="submit" // Triggers handleSubmit on form
            className="auth-button primary"
            disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {/* Divider */}
        <div className="divider">OR</div>

        {/* Google Login Button */}
        <button
          type="button" // Prevents form submission
          className="auth-button google"
          onClick={handleGoogleLogin} // **CRITICAL: Attaches click handler**
          disabled={isLoading}
        >
          Log in with Google
        </button>

        {/* Link to Registration Page */}
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </form>

      {/* --- STYLED JSX --- (Assuming this matches your previous version) */}
      <style jsx>{`
        .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .auth-form { background: #fff; padding: 2.5rem; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08); width: 100%; max-width: 420px; }
        h2 { text-align: center; margin-top: 0; margin-bottom: 2rem; color: #343a40; }
        /* Uses global .form-group styles */
        .auth-button { width: 100%; font-weight: 600; }
        .auth-button.primary { background-color: #007bff; color: white; }
        .auth-button.primary:hover:not(:disabled) { background-color: #0056b3; }
        .auth-button.google { background-color: #fff; color: #495057; border: 1px solid #ced4da; margin-top: 1rem; }
        .auth-button.google:hover:not(:disabled) { background-color: #f8f9fa; }
        .auth-button:disabled { background-color: #e9ecef !important; border-color: #ced4da !important; color: #6c757d !important; cursor: not-allowed; }
        .forgot-password-link { text-align: right; margin-top: -0.5rem; margin-bottom: 1.5rem; }
        .forgot-password-link a { font-size: 0.9em; }
        .divider { text-align: center; margin: 1.5rem 0; color: #adb5bd; font-weight: 500; position: relative; }
        .divider::before, .divider::after { content: ""; display: block; width: 40%; height: 1px; background-color: #dee2e6; position: absolute; top: 50%; }
        .divider::before { left: 0; }
        .divider::after { right: 0; }
        .auth-switch { text-align: center; margin-top: 1.5rem; font-size: 0.95rem; color: #6c757d; }
        .auth-switch a { font-weight: 500; }
        .error-message { color: #dc3545; text-align: center; margin-top: 1rem; font-size: 0.9rem; }
      `}</style>
      {/* --- END STYLED JSX --- */}
    </div>
  );
}

export default LoginPage;