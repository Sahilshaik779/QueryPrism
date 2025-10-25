// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient.js'; 
import toast from 'react-hot-toast'; 

function RegisterPage() {
  // State for form data (email, full name, password)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
  });

  // State to track loading status
  const [isLoading, setIsLoading] = useState(false);
  // Hook for navigation
  const navigate = useNavigate();

  // Handler to update form data state on input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setIsLoading(true); // Start loading indicator

    try {
      // Send registration data to the backend API
      await apiClient.post('/api/auth/register', {
        email: formData.email,
        full_name: formData.fullName,
        password: formData.password,
      });

      // Show success message via toast
      toast.success('Registration successful! Please log in.');
      // Redirect user to the login page
      navigate('/login');

    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(errorMsg);
      setIsLoading(false); 
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Create Your Account</h2>

        {/* Full Name Input Field */}
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

        {/* Email Input Field */}
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

        {/* Password Input Field */}
        <div className="form-group">
          {/* Updated label for clarity */}
          <label htmlFor="password">Password (minimum 8 characters)</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength="8" // Basic HTML5 validation
            required
            disabled={isLoading} 
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="auth-button"
          disabled={isLoading} // Disable while loading
        >
           {isLoading ? 'Registering...' : 'Register'}
        </button>

        {/* Link to Login Page */}
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;