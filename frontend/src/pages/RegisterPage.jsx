import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient.js'; 
import toast from 'react-hot-toast'; 

function RegisterPage() {
  // --- Hooks ---
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
  });
  

  const [isLoading, setIsLoading] = useState(false); 
  const navigate = useNavigate();

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
      // Send the data to the backend
      await apiClient.post('/api/auth/register', {
        email: formData.email,
        full_name: formData.fullName, 
        password: formData.password,
      });

      toast.success('Registration successful! Please log in.'); 
      navigate('/login');

    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(errorMsg); 
      setIsLoading(false); // Set loading false ONLY on error
    } 

  };

  // --- Render ---
  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Create Your Account</h2>
        
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            disabled={isLoading} 
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading} 
          />
        </div>

        <div className="form-group">
          {/* Update label for clarity */}
          <label htmlFor="password">Password (min 8 chars, max 72 bytes)</label> 
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength="8" // Basic HTML5 validation
            required
            disabled={isLoading} // Disable input while loading
          />
        </div>

        {/* Update button text and disable on load */}
        <button type="submit" className="auth-button" disabled={isLoading}>
           {isLoading ? 'Registering...' : 'Register'}
        </button>
        
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;