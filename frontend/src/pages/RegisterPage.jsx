import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';

function RegisterPage() {
  // --- Hooks ---
  // Use a single state object to hold all form data
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
  });
  
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // This function is called when the user clicks "Register"
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop the form from refreshing the page
    setError(null); // Clear any old errors

    try {
      // Send the data to the backend
      // Note: We map JS camelCase (fullName) to Python snake_case (full_name)
      await apiClient.post('/api/auth/register', {
        email: formData.email,
        full_name: formData.fullName,
        password: formData.password,
      });

      // If registration is successful, redirect to the login page
      navigate('/login');

    } catch (err) {
      // If the API returns an error
      if (err.response && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Registration failed. Please try again.');
      }
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
            minLength="8"
            required
          />
        </div>

        <button type="submit" className="auth-button">Register</button>
        
        {/* Display any registration errors */}
        {error && <p className="error-message">{error}</p>}
        
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;