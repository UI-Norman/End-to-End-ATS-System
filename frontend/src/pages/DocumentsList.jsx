import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Upload, 
  AlertCircle, 
  CheckCircle,
  X,
  User,
  Calendar,
  Tag,
  ArrowLeft,
  Clock,
  Trash2
} from 'lucide-react';
import { getDocuments, getCandidates } from '../services/api';
import './Documents.css';

const DocumentsList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get candidate ID from URL query parameter (?candidate=123)
  const candidateIdFromUrl = searchParams.get('candidate');
  
  const [documents, setDocuments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    candidate_id: candidateIdFromUrl || '',
    document_type: '',
    status: ''
  });
  
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    candidate_id: candidateIdFromUrl || '',
    document_type: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);

  // Document types
  const DOCUMENT_TYPES = [
    'Resume/CV',
    'License',
    'Certification',
    'Reference Letter',
    'Background Check',
    'Drug Test',
    'TB Test',
    'Immunization Records',
    'Work Authorization',
    'Contract',
    'Other'
  ];

  // Load candidates and documents when component mounts
  useEffect(() => {
    loadCandidates();
  }, []);

  // Reload documents when filters or search term changes
  useEffect(() => {
    loadDocuments();
  }, [filters, searchTerm]);

  const loadCandidates = async () => {
    try {
      const response = await getCandidates({ limit: 1000 });
      setCandidates(response.data.candidates || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
      setCandidates([]);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      
      const response = await getDocuments(params);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadDocuments();
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData(prev => ({
        ...prev,
        file: file
      }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadData.candidate_id || !uploadData.document_type || !uploadData.file) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);
      
      // TODO: Implement uploadDocument API function
      // const formData = new FormData();
      // formData.append('file', uploadData.file);
      // formData.append('candidate_id', uploadData.candidate_id);
      // formData.append('document_type', uploadData.document_type);
      // await uploadDocument(formData);
      
      // Temporary: Simulate upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Document upload functionality will be implemented with backend API.\n\nAdd the uploadDocument function to your api.js file.');
      setUploadModalOpen(false);
      setUploadData({
        candidate_id: candidateIdFromUrl || '',
        document_type: '',
        file: null
      });
      
      // Reload documents
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document) => {
    if (window.confirm(`Are you sure you want to delete ${document.file_name}?\n\nThis action cannot be undone.`)) {
      try {
        // TODO: Implement deleteDocument API function
        // await deleteDocument(document.id);
        
        alert('Delete document functionality will be implemented with backend API.\n\nAdd the deleteDocument function to your api.js file.');
        // loadDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document.');
      }
    }
  };

  const getCandidateInfo = (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId);
    return candidate || { full_name: 'Unknown', email: '' };
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const getStatusIcon = (status) => {
    const statusLower = status.toLowerCase().replace(/\s+/g, '-');
    switch (statusLower) {
      case 'approved':
        return <CheckCircle size={14} />;
      case 'rejected':
        return <X size={14} />;
      case 'expired':
        return <AlertCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const clearCandidateFilter = () => {
    setFilters(prev => ({
      ...prev,
      candidate_id: ''
    }));
    // Update URL to remove candidate parameter
    navigate('/documents', { replace: true });
  };

  // Filter documents based on search term (client-side filtering for better UX)
  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const candidateInfo = getCandidateInfo(doc.candidate_id);
    
    return (
      doc.file_name?.toLowerCase().includes(searchLower) ||
      doc.document_type?.toLowerCase().includes(searchLower) ||
      candidateInfo.full_name?.toLowerCase().includes(searchLower) ||
      candidateInfo.email?.toLowerCase().includes(searchLower) ||
      doc.status?.toLowerCase().includes(searchLower)
    );
  });

  // Get the selected candidate's name for display
  const selectedCandidate = filters.candidate_id 
    ? candidates.find(c => c.id === parseInt(filters.candidate_id))
    : null;

  return (
    <div className="documents-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            <FileText size={28} /> 
            Documents
          </h1>
          <p className="page-subtitle">
            {selectedCandidate 
              ? `Showing documents for ${selectedCandidate.full_name}`
              : 'Manage candidate documents and credentials'
            }
          </p>
        </div>
        <button className="btn-primary" onClick={() => setUploadModalOpen(true)}>
          <Upload size={20} /> Upload Document
        </button>
      </div>

      {/* Active Candidate Filter Banner */}
      {selectedCandidate && (
        <div className="filter-banner">
          <div className="filter-banner-content">
            <User size={20} />
            <span>Filtered by candidate: <strong>{selectedCandidate.full_name}</strong> ({selectedCandidate.email})</span>
          </div>
          <button className="btn-clear-filter" onClick={clearCandidateFilter}>
            <X size={18} />
            Clear Filter
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by file name, document type, candidate name, email, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-search">Search</button>
        </form>

        <div className="filters">
          <select 
            value={filters.candidate_id} 
            onChange={(e) => handleFilterChange('candidate_id', e.target.value)}
            className="filter-select"
          >
            <option value="">All Candidates</option>
            {candidates.map(candidate => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.full_name}
              </option>
            ))}
          </select>

          <select 
            value={filters.document_type} 
            onChange={(e) => handleFilterChange('document_type', e.target.value)}
            className="filter-select"
          >
            <option value="">All Document Types</option>
            {DOCUMENT_TYPES.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No documents found</h3>
            <p>
              {searchTerm || filters.candidate_id || filters.document_type || filters.status
                ? 'Try adjusting your filters or search'
                : 'Upload your first document to get started'
              }
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>File Name</th>
                <th>Candidate</th>
                <th>Uploaded</th>
                <th>Expiration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map(doc => {
                const candidateInfo = getCandidateInfo(doc.candidate_id);
                return (
                  <tr key={doc.id}>
                    <td>
                      <div className="doc-type">
                        <FileText size={18} />
                        <span>{doc.document_type}</span>
                      </div>
                    </td>
                    <td>
                      <div className="file-info-cell">
                        <div className="file-name">{doc.file_name}</div>
                        {formatFileSize(doc.file_size) && (
                          <div className="file-size">{formatFileSize(doc.file_size)}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="candidate-cell">
                        <div className="candidate-name-doc">{candidateInfo.full_name}</div>
                        <div className="candidate-email-doc">{candidateInfo.email}</div>
                      </div>
                    </td>
                    <td>{formatDate(doc.uploaded_at)}</td>
                    <td>
                      {doc.expiration_date ? (
                        <span className={isExpiringSoon(doc.expiration_date) ? 'expiring-soon' : ''}>
                          {formatDate(doc.expiration_date)}
                          {isExpiringSoon(doc.expiration_date) && (
                            <AlertCircle size={14} style={{marginLeft: '4px'}} />
                          )}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${doc.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {getStatusIcon(doc.status)}
                        {doc.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn-table-action btn-delete-doc"
                          onClick={() => handleDelete(doc)}
                          title="Delete Document"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Upload size={24} />
                Upload Document
              </h2>
              <button 
                className="btn-close-modal"
                onClick={() => setUploadModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="candidate">
                    Candidate <span className="required">*</span>
                  </label>
                  <select
                    id="candidate"
                    value={uploadData.candidate_id}
                    onChange={(e) => setUploadData({...uploadData, candidate_id: e.target.value})}
                    required
                  >
                    <option value="">-- Select Candidate --</option>
                    {candidates.map(candidate => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="document_type">
                    Document Type <span className="required">*</span>
                  </label>
                  <select
                    id="document_type"
                    value={uploadData.document_type}
                    onChange={(e) => setUploadData({...uploadData, document_type: e.target.value})}
                    required
                  >
                    <option value="">-- Select Type --</option>
                    {DOCUMENT_TYPES.map((type, index) => (
                      <option key={index} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="file">
                    File <span className="required">*</span>
                  </label>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      required
                    />
                    {uploadData.file && (
                      <p className="file-selected">
                        Selected: {uploadData.file.name} ({formatFileSize(uploadData.file.size)})
                      </p>
                    )}
                  </div>
                  <p className="field-hint">
                    Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                  </p>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsList;