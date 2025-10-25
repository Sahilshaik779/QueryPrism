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
    setIsLoading(true); // Set loading true

    try {
      await login(formData.email, formData.password);

      // If login is successful, redirect to the chat page
      // toast.success('Login successful!'); 
      navigate('/');

    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Login failed. Please check credentials.';
      toast.error(errorMsg); // Show error toast
      setIsLoading(false); // Set loading false on error
    } 
  };

  // --- Render ---
  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading} // Disable input while loading
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading} 
          />
        </div>

        {/* Update button text and disable on load */}
        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        
        {/* Remove local error display */}
        {/* {error && <p className="error-message">{error}</p>} */}
        
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;