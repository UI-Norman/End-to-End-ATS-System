import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactNode} Protected content or redirect to login
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="auth-loading-container">
        <div className="auth-loading-spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login and save the intended destination
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          message: location.state?.expired 
            ? 'Your session has expired. Please login again.' 
            : null
        }} 
        replace 
      />
    );
  }

  // User is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;