import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  login as loginService, 
  signup as signupService, 
  logout as logoutService,
  getCurrentUser,
  isAuthenticated as checkAuth
} from '../services/authService';

// Create context
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const currentUser = getCurrentUser();
        const authenticated = checkAuth();
        
        if (authenticated && currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          console.log('✅ Auto-login successful - user restored from storage');
        } else {
          setUser(null);
          setIsAuthenticated(false);
          console.log('ℹ️ No saved login found');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login function
   * @param {string} email 
   * @param {string} password 
   * @param {boolean} rememberMe 
   */
  const login = async (email, password, rememberMe = true) => {
    try {
      const data = await loginService(email, password, rememberMe);
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  /**
   * Signup function
   * @param {Object} userData 
   */
  const signup = async (userData) => {
    try {
      const data = await signupService(userData);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  /**
   * Logout function
   */
  const logout = () => {
    logoutService();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Context value
  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use authentication context
 * @returns {Object} Authentication context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;