// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient.js'; // Adjust extension if needed
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
        full_name: formData.fullName, // Map JS camelCase to Python snake_case
        password: formData.password,
      });

      // Show success message via toast
      toast.success('Registration successful! Please log in.');
      // Redirect user to the login page
      navigate('/login');

    } catch (err) {
      // Show error message via toast if registration fails
      const errorMsg = err.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(errorMsg);
      setIsLoading(false); // Stop loading indicator only on error
    }
    // No 'finally' block needed as navigation unmounts component on success
  };

  return (
    // Apply styles using plain class names defined in <style jsx>
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Create Your Account</h2>

        {/* Full Name Input Field - Uses global .form-group style */}
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            name="fullName" // Matches state key
            value={formData.fullName} // Controlled input
            onChange={handleChange} // Update state
            required
            disabled={isLoading} // Disable while loading
          />
        </div>

        {/* Email Input Field - Uses global .form-group style */}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email" // Matches state key
            value={formData.email} // Controlled input
            onChange={handleChange} // Update state
            required
            disabled={isLoading} // Disable while loading
          />
        </div>

        {/* Password Input Field - Uses global .form-group style */}
        <div className="form-group">
          <label htmlFor="password">Password (minimum 8 characters)</label>
          <input
            type="password"
            id="password"
            name="password" // Matches state key
            value={formData.password} // Controlled input
            onChange={handleChange} // Update state
            minLength="8" // Basic HTML5 validation
            required
            disabled={isLoading} // Disable while loading
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="auth-button primary" // Add primary class for styling
          disabled={isLoading} // Disable while loading
        >
           {isLoading ? 'Registering...' : 'Register'}
        </button>

        {/* Link to Login Page */}
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>

      {/* --- STYLED JSX --- */}
      {/* Reusing many styles defined globally or similar to LoginPage */}
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
          margin-bottom: 2rem;
          color: #343a40;
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

export default RegisterPage;