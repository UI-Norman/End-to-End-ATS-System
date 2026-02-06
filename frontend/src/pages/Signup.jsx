import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    role: 'recruiter',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateForm = () => {
    // Check all fields are filled
    if (!formData.email || !formData.password || !formData.confirmPassword || 
        !formData.first_name || !formData.last_name) {
      setError('Please fill in all fields');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Check password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    // Check passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Prepare data for API (remove confirmPassword)
    const { confirmPassword, ...signupData } = formData;

    // Attempt signup
    const result = await signup(signupData);

    if (result.success) {
      // Redirect to login page on success with success message
      navigate('/login', { 
        state: { message: 'Account created successfully! Please sign in.' }
      });
    } else {
      // Show error message
      setError(result.error || 'Signup failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo/Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <Briefcase size={44} strokeWidth={2} />
          </div>
          <h1>Travel Healthcare ATS</h1>
          <p className="auth-subtitle">Create your account</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* First and Last Name Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">
                <User size={18} />
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                placeholder="Enter first name"
                value={formData.first_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">
                <User size={18} />
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                placeholder="Enter last name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">
              <Mail size={18} />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} />
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Create a password (min 6 characters)"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword">
              <CheckCircle size={18} />
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                Creating account...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;