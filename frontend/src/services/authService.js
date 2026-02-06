const API_URL = 'http://localhost:8000/api';

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} rememberMe - Whether to persist login across sessions (default: true)
 * @returns {Promise} Response with token and user data
 */
export const login = async (email, password, rememberMe = true) => {
  // FastAPI expects form data for OAuth2PasswordRequestForm
  const formData = new FormData();
  formData.append('username', email); 
  formData.append('password', password);

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  const data = await response.json();
  const storage = rememberMe ? localStorage : sessionStorage;
  
  storage.setItem('token', data.access_token);
  storage.setItem('user', JSON.stringify(data.user));
  storage.setItem('rememberMe', rememberMe.toString());
  storage.setItem('loginTime', new Date().getTime().toString());
  
  console.log(`✅ User logged in successfully (Remember Me: ${rememberMe})`);
  
  return data;
};

/**
 * Signup new user
 * @param {Object} userData 
 * @returns {Promise} 
 */
export const signup = async (userData) => {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Signup failed');
  }

  const data = await response.json();
  console.log('✅ Signup successful - user needs to login');
  
  return data;
};

/**
 * Logout user
 * Clears token and user data from both localStorage and sessionStorage
 */
export const logout = () => {
  // Clear from both storages to be safe
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberMe');
  localStorage.removeItem('loginTime');
  
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('rememberMe');
  sessionStorage.removeItem('loginTime');
  
  console.log('✅ User logged out successfully');
};

/**
 * Get current user data from storage
 * @returns {Object|null} 
 */
export const getCurrentUser = () => {
  // Check localStorage first (persistent), then sessionStorage
  let userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Get authentication token from storage
 * @returns {string|null} 
 */
export const getToken = () => {
  // Check localStorage first (persistent), then sessionStorage
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is logged in
 */
export const isAuthenticated = () => {
  const token = getToken();
  
  if (!token) {
    return false;
  }
  
  const loginTime = localStorage.getItem('loginTime') || sessionStorage.getItem('loginTime');
  if (loginTime) {
    const daysSinceLogin = (new Date().getTime() - parseInt(loginTime)) / (1000 * 60 * 60 * 24);
    
    // If login is older than 30 days, force re-login
    if (daysSinceLogin > 30) {
      console.log('⚠️ Login expired (>30 days old) - clearing session');
      logout();
      return false;
    }
  }
  
  return true;
};

/**
 * Verify if token is still valid with the backend
 * @returns {Promise<boolean>}
 */
export const verifyToken = async () => {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Token is invalid - clear storage
      logout();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
};

/**
 * Check if "Remember Me" was enabled
 * @returns {boolean} 
 */
export const isRemembered = () => {
  return localStorage.getItem('rememberMe') === 'true';
};