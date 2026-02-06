import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, MapPin, Calendar, Award, 
  Briefcase, FileText, DollarSign, Star, ArrowLeft,
  CheckCircle, AlertCircle, Clock, TrendingUp, Send, Edit, XCircle, MoreVertical
} from 'lucide-react';
import { getCandidate, getMatchesForCandidate, sendEmailToCandidate } from '../services/api';
import EmailModal from './EmailModal';
import './CandidateDetail.css';

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [renderKey, setRenderKey] = useState(0);
  
  const dropdownRef = useRef(null);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedJobForEmail, setSelectedJobForEmail] = useState(null);

  const handleSendOpportunity = (job = null) => {
    setSelectedJobForEmail(job);
    setEmailModalOpen(true);
  };

  useEffect(() => {
    if (id) {
      loadCandidateData();
    }
  }, [id]);

  useEffect(() => {
    if (candidate) {
      console.log('📊 Candidate state updated:', {
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        full_name: candidate.full_name,
        status: candidate.status,
        renderKey: renderKey
      });
    }
  }, [candidate, renderKey]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowActionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadCandidateData = async () => {
    try {
      setLoading(true);
      const [candidateResponse, matchesResponse] = await Promise.all([
        getCandidate(id),
        getMatchesForCandidate(id, 50)
      ]);
      
      let candidateData = candidateResponse.data;
      
      const savedEdits = sessionStorage.getItem('candidateEdits');
      if (savedEdits) {
        const editsMap = JSON.parse(savedEdits);
        if (editsMap[id]) {
          console.log(`📥 Restoring edits for candidate ${id}:`, editsMap[id]);
          candidateData = { ...candidateData, ...editsMap[id] };
        }
      }
      
      setCandidate(candidateData);
      setMatches(matchesResponse.data.matches || []);
    } catch (error) {
      console.error('Error loading candidate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActionsDropdown = () => {
    setShowActionsDropdown(!showActionsDropdown);
  };

  const handleEditInline = () => {
    setShowActionsDropdown(false);
    setEditingCandidate(true);
    setEditFormData({
      first_name: candidate.first_name || '',
      last_name: candidate.last_name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      primary_specialty: candidate.primary_specialty || '',
      years_experience: candidate.years_experience || '',
      status: candidate.status || 'active'
    });
  };

  const handleSaveEdit = () => {
    console.log('💾 Saving changes:', editFormData);
    
    const updatedFields = {
      first_name: editFormData.first_name,
      last_name: editFormData.last_name,
      full_name: `${editFormData.first_name} ${editFormData.last_name}`,
      email: editFormData.email,
      phone: editFormData.phone,
      primary_specialty: editFormData.primary_specialty,
      years_experience: parseInt(editFormData.years_experience) || 0,
      status: editFormData.status
    };
    
    const updatedCandidate = { ...candidate, ...updatedFields };
    
    console.log('✅ Updated candidate object:', updatedCandidate);
    console.log('🔄 Forcing re-render...');
    
    const savedEdits = sessionStorage.getItem('candidateEdits');
    const editsMap = savedEdits ? JSON.parse(savedEdits) : {};
    editsMap[id] = updatedFields;
    sessionStorage.setItem('candidateEdits', JSON.stringify(editsMap));
    console.log('💾 Saved to sessionStorage:', editsMap);
    
    setCandidate(updatedCandidate);
    setRenderKey(prev => prev + 1);
    setEditingCandidate(false);
    setEditFormData({});
    
    console.log('✅ Candidate updated and re-rendered!');
    alert('✅ Candidate updated successfully!\n\n💡 Changes will persist across navigation until page reload.');
  };

  const handleCancelEdit = () => {
    setEditingCandidate(false);
    setEditFormData({});
  };

  const handleSendEmail = async () => {
    setShowActionsDropdown(false);
    
    const subject = prompt(
      `📧 Email to ${candidate.full_name}`,
      'Job Opportunity - Travel Healthcare'
    );
    
    if (!subject) return;
    
    const message = prompt(
      '✏️ Enter your message:',
      `Hi ${candidate.first_name},\n\nI wanted to reach out about some excellent travel healthcare opportunities that match your profile.\n\nWould you be available for a quick call to discuss?\n\nThank you!`
    );
    
    if (!message) return;
    
    try {
      console.log(`📧 Sending email to ${candidate.email}...`);
      
      const response = await sendEmailToCandidate({
        to_email: candidate.email,
        subject: subject,
        message: message,
        candidate_name: candidate.full_name
      });
      
      alert(`✅ Email sent successfully to ${candidate.email}!`);
      console.log('✅ Email sent:', response.data);
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      
      let errorMsg = 'Failed to send email. Please try again.';
      
      if (error.response?.data?.detail) {
        errorMsg += `\n\nError: ${error.response.data.detail}`;
      } else if (error.message) {
        errorMsg += `\n\nError: ${error.message}`;
      }
      
      alert(`❌ ${errorMsg}`);
    }
  };

  const handleChangeStatus = (newStatus) => {
    setShowActionsDropdown(false);
    
    console.log(`🔄 Changing status from ${candidate.status} to ${newStatus}`);
    
    const updatedCandidate = {
      ...candidate,
      status: newStatus
    };
    
    const savedEdits = sessionStorage.getItem('candidateEdits');
    const editsMap = savedEdits ? JSON.parse(savedEdits) : {};
    editsMap[id] = { 
      ...(editsMap[id] || {}), 
      status: newStatus 
    };
    sessionStorage.setItem('candidateEdits', JSON.stringify(editsMap));
    
    setCandidate(updatedCandidate);
    setRenderKey(prev => prev + 1);
    
    console.log('✅ Status updated!');
    alert(`${candidate.full_name} marked as ${newStatus}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading candidate details...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="error-container">
        <AlertCircle size={48} />
        <h3>Candidate Not Found</h3>
        <button className="btn-primary" onClick={() => navigate('/candidates')}>
          Back to Candidates
        </button>
      </div>
    );
  }

  return (
    <div className="candidate-detail-page" key={renderKey}>
      {/* Header */}
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="header-content">
          <div className="candidate-header-info">
            {editingCandidate ? (
              <div className="edit-header-form">
                <div className="candidate-avatar-large">
                  {editFormData.first_name?.charAt(0) || 'C'}{editFormData.last_name?.charAt(0) || 'D'}
                </div>
                <div className="edit-fields-container">
                  <div className="edit-name-group">
                    <input
                      type="text"
                      className="edit-input-header"
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                      placeholder="First Name"
                    />
                    <input
                      type="text"
                      className="edit-input-header"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                      placeholder="Last Name"
                    />
                  </div>
                  <input
                    type="email"
                    className="edit-input-header"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    placeholder="Email"
                  />
                  <div className="edit-specialty-status-group">
                    <input
                      type="text"
                      className="edit-input-header"
                      value={editFormData.primary_specialty}
                      onChange={(e) => setEditFormData({...editFormData, primary_specialty: e.target.value})}
                      placeholder="Specialty"
                    />
                    <input
                      type="number"
                      className="edit-input-header small"
                      value={editFormData.years_experience}
                      onChange={(e) => setEditFormData({...editFormData, years_experience: e.target.value})}
                      placeholder="Years"
                    />
                    <select
                      className="edit-select-header"
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="placed">Placed</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="candidate-avatar-large">
                  {candidate.first_name?.charAt(0)}{candidate.last_name?.charAt(0)}
                </div>
                <div>
                  <h1>{candidate.full_name || `${candidate.first_name} ${candidate.last_name}`}</h1>
                  <p className="candidate-specialty">
                    <Award size={18} />
                    {candidate.primary_specialty || 'No specialty specified'}
                  </p>
                  <div className="quick-stats">
                    <span className="stat-badge">
                      <Briefcase size={14} />
                      {candidate.years_experience || 0} years exp
                    </span>
                    <span className={`status-badge status-${candidate.status?.toLowerCase()}`}>
                      {candidate.status || 'Active'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="header-actions">
            {editingCandidate ? (
              <div className="edit-actions">
                <button 
                  className="btn-primary"
                  onClick={handleSaveEdit}
                >
                  <CheckCircle size={18} />
                  Save Changes
                </button>
                <button 
                  className="btn-secondary"
                  onClick={handleCancelEdit}
                >
                  <XCircle size={18} />
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="actions-dropdown" ref={dropdownRef}>
                  <button 
                    className="btn-secondary"
                    onClick={toggleActionsDropdown}
                  >
                    <MoreVertical size={18} />
                    Actions
                  </button>
                  
                  {showActionsDropdown && (
                    <div className="dropdown-menu">
                      <button 
                        className="dropdown-item"
                        onClick={handleEditInline}
                      >
                        <Edit size={16} />
                        <span>Edit Inline</span>
                      </button>
                      
                      <button 
                        className="dropdown-item"
                        onClick={handleSendEmail}
                      >
                        <Mail size={16} />
                        <span>Send Email</span>
                      </button>
                      
                      <div className="dropdown-divider"></div>
                      
                      {candidate.status !== 'active' && (
                        <button 
                          className="dropdown-item status-action"
                          onClick={() => handleChangeStatus('active')}
                        >
                          <CheckCircle size={16} />
                          <span>Mark as Active</span>
                        </button>
                      )}
                      
                      {candidate.status !== 'placed' && (
                        <button 
                          className="dropdown-item status-action"
                          onClick={() => handleChangeStatus('placed')}
                        >
                          <CheckCircle size={16} />
                          <span>Mark as Placed</span>
                        </button>
                      )}
                      
                      {candidate.status !== 'inactive' && (
                        <button 
                          className="dropdown-item status-action"
                          onClick={() => handleChangeStatus('inactive')}
                        >
                          <XCircle size={16} />
                          <span>Mark as Inactive</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button className="btn-secondary" onClick={handleSendEmail}>
                  <Mail size={18} />
                  Send Email
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info Bar */}
      <div className="contact-info-bar">
        <div className="contact-item">
          <Mail size={16} />
          <a href={`mailto:${candidate.email}`}>{candidate.email}</a>
        </div>
        {candidate.phone && (
          <div className="contact-item">
            <Phone size={16} />
            <a href={`tel:${candidate.phone}`}>{candidate.phone}</a>
          </div>
        )}
        {candidate.preferred_states && candidate.preferred_states.length > 0 && (
          <div className="contact-item">
            <MapPin size={16} />
            <span>Prefers: {candidate.preferred_states.join(', ')}</span>
          </div>
        )}
        {candidate.availability_date && (
          <div className="contact-item">
            <Calendar size={16} />
            <span>Available: {candidate.availability_date}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <User size={18} />
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          <TrendingUp size={18} />
          Job Matches ({matches.length})
        </button>
        <button 
          className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={18} />
          Documents
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={18} />
          History
        </button>
      </div>

      {/* Tab Content */}
      <div className="detail-content">
        {activeTab === 'overview' && (
          <OverviewTab candidate={candidate} />
        )}
        
        {activeTab === 'matches' && (
          <MatchesTab matches={matches} candidateId={candidate.candidate_id} />
        )}
        
        {activeTab === 'documents' && (
          <DocumentsTab candidateId={candidate.candidate_id} />
        )}
        
        {activeTab === 'history' && (
          <HistoryTab candidateId={candidate.candidate_id} />
        )}
      </div>

      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        candidate={candidate}
        job={selectedJobForEmail}
        onSend={async (emailData) => {
          try {
            await sendEmailToCandidate(emailData);
            alert('✅ Email sent successfully!');
          } catch (error) {
            alert('Failed to send email: ' + (error.message || 'Unknown error'));
          }
        }}
      />
    </div>
  );
};

// ==================== OVERVIEW TAB ====================
const OverviewTab = ({ candidate }) => {
  return (
    <div className="overview-tab">
      <div className="overview-grid">
        <div className="info-card">
          <h3>
            <Briefcase size={20} />
            Professional Information
          </h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Primary Specialty:</span>
              <span className="value">{candidate.primary_specialty || 'Not specified'}</span>
            </div>
            <div className="info-row">
              <span className="label">Years of Experience:</span>
              <span className="value">{candidate.years_experience || 0} years</span>
            </div>
            <div className="info-row">
              <span className="label">Desired Contract Length:</span>
              <span className="value">{candidate.desired_contract_weeks || 'Flexible'} weeks</span>
            </div>
            {candidate.min_weekly_pay && (
              <div className="info-row">
                <span className="label">Minimum Weekly Pay:</span>
                <span className="value">${candidate.min_weekly_pay}</span>
              </div>
            )}
          </div>
        </div>

        <div className="info-card">
          <h3>
            <MapPin size={20} />
            Location Preferences
          </h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Preferred States:</span>
              <span className="value">
                {candidate.preferred_states && candidate.preferred_states.length > 0
                  ? candidate.preferred_states.join(', ')
                  : 'Not specified'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Availability Date:</span>
              <span className="value">{candidate.availability_date || 'Not specified'}</span>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h3>
            <CheckCircle size={20} />
            Status & Availability
          </h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Current Status:</span>
              <span className="value">
                {candidate.status === 'active' ? (
                  <span className="badge-success">
                    <CheckCircle size={14} />
                    Available for work
                  </span>
                ) : (
                  <span className="badge-warning">
                    <AlertCircle size={14} />
                    {candidate.status || 'Unknown'}
                  </span>
                )}
              </span>
            </div>
            {candidate.created_at && (
              <div className="info-row">
                <span className="label">Joined:</span>
                <span className="value">{new Date(candidate.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="info-card">
          <h3>
            <Phone size={20} />
            Contact Information
          </h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Email:</span>
              <span className="value">
                <a href={`mailto:${candidate.email}`}>{candidate.email}</a>
              </span>
            </div>
            {candidate.phone && (
              <div className="info-row">
                <span className="label">Phone:</span>
                <span className="value">
                  <a href={`tel:${candidate.phone}`}>{candidate.phone}</a>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MATCHES TAB ====================
const MatchesTab = ({ matches, candidateId }) => {
  const CircularScore = ({ score }) => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getScoreColor = (score) => {
      if (score >= 85) return '#10b981';
      if (score >= 70) return '#3b82f6';
      if (score >= 50) return '#f59e0b';
      return '#ef4444';
    };

    return (
      <div className="circular-score">
        <svg width="50" height="50">
          <circle cx="25" cy="25" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
          <circle
            cx="25" cy="25" r={radius} fill="none"
            stroke={getScoreColor(score)} strokeWidth="4"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform="rotate(-90 25 25)"
          />
        </svg>
        <span className="score-text">{score}%</span>
      </div>
    );
  };

  return (
    <div className="matches-tab">
      {matches.length === 0 ? (
        <div className="empty-state">
          <TrendingUp size={48} />
          <h3>No matching jobs found</h3>
          <p>We'll notify you when suitable opportunities become available</p>
        </div>
      ) : (
        <div className="matches-list">
          {matches.map((match, idx) => (
            <div key={match.job_id} className="match-card">
              <div className="match-rank">#{idx + 1}</div>
              <div className="match-content">
                <div className="match-header">
                  <div>
                    <h4>{match.title || match.specialty_required}</h4>
                    <p className="match-location">
                      <MapPin size={14} />
                      {match.facility}, {match.state}
                    </p>
                  </div>
                  <CircularScore score={match.score} />
                </div>
                
                <div className="match-details-grid">
                  <div className="detail-item">
                    <span className="label">Pay Rate:</span>
                    <span className="value">${match.pay_rate_weekly || 'N/A'}/week</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Start Date:</span>
                    <span className="value">{match.start_date || 'Flexible'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Contract:</span>
                    <span className="value">{match.contract_weeks || 'N/A'} weeks</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Specialty:</span>
                    <span className="value">{match.specialty_required}</span>
                  </div>
                </div>

                {match.match_details?.reasons && match.match_details.reasons.length > 0 && (
                  <div className="match-reasons">
                    <h5>Why this is a good match:</h5>
                    <ul>
                      {match.match_details.reasons.map((reason, i) => (
                        <li key={i}>
                          <CheckCircle size={14} className="check-icon" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== DOCUMENTS TAB ====================
const DocumentsTab = ({ candidateId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [candidateId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/documents?candidate_id=${candidateId}`);
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-state"><div className="spinner"></div></div>;
  }

  return (
    <div className="documents-tab">
      {documents.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No documents found</h3>
          <p>Upload candidate documents to get started</p>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map(doc => (
            <div key={doc.document_id} className="document-card">
              <div className="document-icon">
                <FileText size={24} />
              </div>
              <div className="document-info">
                <h4>{doc.document_type}</h4>
                <p className="file-name">{doc.file_name}</p>
                {doc.expiration_date && (
                  <p className="expiry-date">
                    <Calendar size={14} />
                    Expires: {doc.expiration_date}
                  </p>
                )}
              </div>
              <span className={`status-badge status-${doc.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== HISTORY TAB ====================
const HistoryTab = ({ candidateId }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, [candidateId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/assignments?candidate_id=${candidateId}`);
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-state"><div className="spinner"></div></div>;
  }

  return (
    <div className="history-tab">
      {assignments.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} />
          <h3>No assignment history</h3>
          <p>This candidate has no previous assignments</p>
        </div>
      ) : (
        <div className="timeline">
          {assignments.map(assignment => (
            <div key={assignment.assignment_id} className="timeline-item">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <h4>{assignment.job?.facility || 'Unknown Facility'}</h4>
                  <span className={`status-badge status-${assignment.status?.toLowerCase()}`}>
                    {assignment.status}
                  </span>
                </div>
                <p className="timeline-location">
                  <MapPin size={14} />
                  {assignment.job?.state || 'N/A'}
                </p>
                <div className="timeline-dates">
                  <span>
                    <Calendar size={14} />
                    {assignment.start_date || 'N/A'} → {assignment.end_date || 'N/A'}
                  </span>
                  {assignment.days_remaining !== null && assignment.days_remaining !== undefined && assignment.status === 'Active' && (
                    <span className="days-badge">
                      {assignment.days_remaining} days remaining
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;