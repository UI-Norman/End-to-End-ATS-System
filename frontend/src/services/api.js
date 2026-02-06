import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests 
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '#/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH APIs ====================
export const login = (username, password) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  
  return axios.post(`${API_BASE_URL}/auth/login`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const signup = (userData) => {
  return axios.post(`${API_BASE_URL}/auth/signup`, userData);
};

export const getCurrentUser = () => {
  return api.get('/auth/me');
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '#/login';
};

// ==================== DASHBOARD APIs ====================
export const getDashboardStats = () => {
  return api.get('/dashboard/stats');
};

// ==================== CANDIDATES APIs ====================
export const getCandidates = (params = {}) => {
  return api.get('/candidates', { params });
};

export const getCandidate = (id) => {
  return api.get(`/candidates/${id}`);
};

export const createCandidate = (candidateData) => {
  return api.post('/candidates', candidateData);
};

// ==================== JOBS APIs ====================
export const getJobs = (params = {}) => {
  return api.get('/jobs', { params });
};

export const createJob = (jobData) => {
  return api.post('/jobs', jobData);
};

export const getJob = (id) => {
  return api.get(`/jobs/${id}`);
};

// ==================== ASSIGNMENTS APIs ====================
export const getAssignments = (params = {}) => {
  return api.get('/assignments', { params });
};

export const getEndingAssignments = (daysThreshold = 30) => {
  return api.get('/assignments/ending-soon', {
    params: { days_threshold: daysThreshold }
  });
};

// ==================== ALERTS APIs ====================
export const getAlerts = (params = {}) => {
  const cleanedParams = { ...params };

  if ('is_read' in cleanedParams) {
    const value = cleanedParams.is_read;
    cleanedParams.is_read = value === true || 
                           value === 'true' || 
                           value === 1 || 
                           value === '1' ? true :
                           value === false || 
                           value === 'false' || 
                           value === 0 || 
                           value === '0' ? false : undefined;
  }

  console.log('[API getAlerts] Sending params:', cleanedParams);

  return api.get('/alerts', { params: cleanedParams })
    .then(response => {
      console.log('[API getAlerts] Success - received data:', response.data);
      return response;
    })
    .catch(error => {
      console.error('[API getAlerts] Error:', error.message);
      if (error.response) {
        console.error('[API getAlerts] Response status:', error.response.status);
        console.error('[API getAlerts] Response data:', error.response.data);
      }
      throw error;
    });
};

export const markAlertRead = (alertId) => {
  console.log(`[API] Marking alert ${alertId} as read`);
  return api.put(`/alerts/${alertId}/read`);
};

export const markAlertAsRead = (alertId) => {
  console.log(`[API] Marking alert ${alertId} as read (alias)`);
  return api.put(`/alerts/${alertId}/read`);
};

export const markAlertUnread = (alertId) => {
  console.log(`[API] Marking alert ${alertId} as UNREAD`);
  return api.put(`/alerts/${alertId}/unread`);
};

export const markAllAlertsUnread = () => {
  console.log('[API] Marking ALL alerts as UNREAD');
  return api.put('/alerts/unread-all');
};

// ==================== DOCUMENTS APIs ====================
export const getDocuments = (params = {}) => {
  return api.get('/documents', { params });
};

// ==================== EXPENSES APIs ====================
export const getExpenses = (params = {}) => {
  return api.get('/expenses', { params });
};
export const createExpense = (expenseData) => {
  console.log('[API] Creating expense:', expenseData);
  return api.post('/expenses', expenseData);
};

// ==================== MATCHING APIs ====================
export const getMatchesForJob = (jobId, minScore = 50) => {
  return api.get(`/matching/job/${jobId}`, {
    params: { min_score: minScore }
  });
};

export const getMatchesForCandidate = (candidateId, minScore = 50) => {
  return api.get(`/matching/candidate/${candidateId}`, {
    params: { min_score: minScore }
  });
};

export const getEndingAssignmentsWithMatches = (days = null) => {
  return api.get('/matching/ending-assignments', {
    params: days ? { days } : {}
  });
};

export const runBatchMatching = (minScore = 70) => {
  return api.post('/matching/batch-run', null, {
    params: { min_score: minScore }
  });
};

export const submitCandidateResponse = (candidateId, responseData) => {
  return api.post(`/responses?candidate_id=${candidateId}`, responseData);
};

export const getCandidateResponses = (candidateId) => {
  return api.get(`/responses/candidate/${candidateId}`);
};

// ==================== IMPORT APIs ====================
export const importCandidates = (file) => {
  const formData = new FormData();
  formData.append('file', file);
 
  return api.post('/import/candidates', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const importJobs = (file) => {
  const formData = new FormData();
  formData.append('file', file);
 
  return api.post('/import/jobs', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Send job opportunity to candidate
export const sendJobOpportunity = (data) => {
  return api.post('/matching/send-opportunity', data);
};

export const importAssignments = (file) => {
  const formData = new FormData();
  formData.append('file', file);
 
  return api.post('/import/assignments', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const importDocuments = (file) => {
  const formData = new FormData();
  formData.append('file', file);
 
  return api.post('/import/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const importExpenses = (file) => {
  const formData = new FormData();
  formData.append('file', file);
 
  return api.post('/import/expenses', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// ==================== SAMPLE FILE DOWNLOADS ====================
export const getSampleFileUrl = (fileType) => {
  return `${API_BASE_URL}/sample-files/${fileType}`;
};

// ==================== SPECIALTIES APIs ====================
export const getCandidateSpecialties = () => {
  return api.get('/specialties/candidates');
};

export const getJobSpecialties = () => {
  return api.get('/specialties/jobs');
};

// ==================== EMAIL APIs ====================
/**
 * Send an email to a candidate
 * @param {Object} emailData - Email data
 * @param {string} emailData.to_email - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.message - Email message body
 * @param {string} emailData.candidate_name - Candidate's name
 * @returns {Promise} API response
 */
export const sendEmailToCandidate = (emailData) => {
  console.log('[API] Sending email to candidate:', emailData.to_email);
  return api.post('/email/send-to-candidate', emailData);
};
// ============================================
// DOCUMENTS API FUNCTIONS
// ============================================

export const uploadDocument = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - browser sets it automatically with boundary
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload document');
  }
  
  return response.json();
};

export const deleteDocument = async (documentId) => {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete document');
  }
  
  return response.json();
};
export default api;