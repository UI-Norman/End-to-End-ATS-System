import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Plus, Edit, Mail, Phone, Trash2, MoreVertical, Send, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';
import { getCandidates, getCandidateSpecialties, sendEmailToCandidate } from '../services/api';
import './CandidatesList.css';

const CandidatesList = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    specialty: '',
    state: ''
  });
  
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadSpecialties();
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [filters, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadSpecialties = async () => {
    try {
      const response = await getCandidateSpecialties();
      setSpecialties(response.data.specialties);
    } catch (error) {
      console.error('Error loading specialties:', error);
    }
  };

  const loadCandidates = async () => {
    try {
      setLoading(true);
      
      const response = await getCandidates({
        search: '',
        limit: 10000,
        skip: 0,
        status: filters.status,
        specialty: filters.specialty,
        state: filters.state
      });
      
      let candidatesData = response.data.candidates;
      
      const savedEdits = sessionStorage.getItem('candidateEdits');
      if (savedEdits) {
        const editsMap = JSON.parse(savedEdits);
        
        candidatesData = candidatesData.map(candidate => {
          if (editsMap[candidate.id]) {
            console.log(`📥 Restoring edits for candidate ${candidate.id}`);
            return { ...candidate, ...editsMap[candidate.id] };
          }
          return candidate;
        });
      }
      
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        candidatesData = candidatesData.filter(candidate => {
          const firstName = (candidate.first_name || '').toLowerCase();
          const lastName = (candidate.last_name || '').toLowerCase();
          const fullName = `${firstName} ${lastName}`;
          const email = (candidate.email || '').toLowerCase();
          const specialty = (candidate.primary_specialty || '').toLowerCase();
          
          return firstName.includes(searchLower) || 
                 lastName.includes(searchLower) ||
                 fullName.includes(searchLower) || 
                 email.includes(searchLower) || 
                 specialty.includes(searchLower);
        });
      }
      
      setCandidates(candidatesData);
      
      console.log(`📊 Loaded ${candidatesData.length} candidates (search: "${searchTerm}", filters: ${JSON.stringify(filters)})`);
    } catch (error) {
      console.error('Error loading candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const toggleDropdown = (candidateId, event) => {
    if (openDropdown === candidateId) {
      setOpenDropdown(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      const dropdownHeight = 400;
      
      if (spaceBelow >= dropdownHeight) {
        setDropdownPosition('bottom');
      } else if (spaceAbove >= dropdownHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition(spaceBelow > spaceAbove ? 'bottom' : 'top');
      }
      
      setOpenDropdown(candidateId);
    }
  };

  const handleEditInline = (candidate) => {
    setOpenDropdown(null);
    setEditingCandidate(candidate.id);
    setEditFormData({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone || '',
      primary_specialty: candidate.primary_specialty,
      years_experience: candidate.years_experience || '',
      candidate_status: candidate.status
    });
  };

  const handleSaveEdit = async (candidateId) => {
    try {
      console.log('💾 Saving candidate:', editFormData);
      
      const updatedFields = {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        full_name: `${editFormData.first_name} ${editFormData.last_name}`,
        email: editFormData.email,
        phone: editFormData.phone,
        primary_specialty: editFormData.primary_specialty,
        years_experience: parseInt(editFormData.years_experience) || 0,
        status: editFormData.candidate_status
      };
      
      const savedEdits = sessionStorage.getItem('candidateEdits');
      const editsMap = savedEdits ? JSON.parse(savedEdits) : {};
      editsMap[candidateId] = updatedFields;
      sessionStorage.setItem('candidateEdits', JSON.stringify(editsMap));
      console.log('💾 Saved to sessionStorage:', editsMap);
      
      setCandidates(prev => prev.map(c => {
        if (c.id === candidateId) {
          const updatedCandidate = { ...c, ...updatedFields };
          console.log('✅ Updated candidate:', updatedCandidate);
          return updatedCandidate;
        }
        return c;
      }));
      
      setEditingCandidate(null);
      setEditFormData({});
      
      console.log('✅ Candidate updated successfully!');
      alert('✅ Candidate updated successfully!\n\n💡 Changes will persist across navigation until page reload.');
    } catch (error) {
      console.error('Error updating candidate:', error);
      alert('Failed to update candidate');
    }
  };

  const handleCancelEdit = () => {
    setEditingCandidate(null);
    setEditFormData({});
  };

  const handleSendEmail = async (candidate) => {
    setOpenDropdown(null);
    
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

  const handleSendJobMatch = (candidate) => {
    setOpenDropdown(null);
    navigate(`/matching?candidate=${candidate.id}`);
  };

  const handleViewDocuments = (candidate) => {
    setOpenDropdown(null);
    navigate(`/documents?candidate=${candidate.id}`);
  };

  const handleChangeStatus = (candidate, newStatus) => {
    setOpenDropdown(null);
    
    console.log(`🔄 Changing status from ${candidate.status} to ${newStatus}`);
    
    const savedEdits = sessionStorage.getItem('candidateEdits');
    const editsMap = savedEdits ? JSON.parse(savedEdits) : {};
    editsMap[candidate.id] = { 
      ...(editsMap[candidate.id] || {}), 
      status: newStatus 
    };
    sessionStorage.setItem('candidateEdits', JSON.stringify(editsMap));
    
    setCandidates(prev => prev.map(c => 
      c.id === candidate.id 
        ? { ...c, status: newStatus }
        : c
    ));
    
    console.log(`✅ Status updated to ${newStatus}`);
    alert(`${candidate.full_name} marked as ${newStatus}`);
  };

  const handleDelete = (candidate) => {
    setOpenDropdown(null);
    
    if (window.confirm(`Are you sure you want to delete ${candidate.full_name}?\n\nThis action cannot be undone.`)) {
      setCandidates(prev => prev.filter(c => c.id !== candidate.id));
      alert(`${candidate.full_name} has been deleted`);
    }
  };

  return (
    <div className="candidates-page">
      <div className="page-header">
        <div>
          <h1>
            <Users size={28} /> Candidates
          </h1>
          <p className="page-subtitle">Manage your candidate database</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => navigate('/candidates/new')}
        >
          <Plus size={20} />
          Add Candidate
        </button>
      </div>

      <div className="search-section">
        <div className="search-input-group">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by name, email, or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="btn-clear-search"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>

        <div className="filters">
          <select
            className="filter-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="placed">Placed</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            className="filter-select"
            value={filters.specialty}
            onChange={(e) => handleFilterChange('specialty', e.target.value)}
          >
            <option value="">All Specialties</option>
            {specialties.map((specialty, idx) => (
              <option key={idx} value={specialty}>{specialty}</option>
            ))}
          </select>
        </div>
      </div>

      {!loading && (
        <div className="results-info">
          <p>
            Showing <strong>{candidates.length}</strong> candidate{candidates.length !== 1 ? 's' : ''}
            {searchTerm && <> matching "<strong>{searchTerm}</strong>"</>}
          </p>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading candidates...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No candidates found</h3>
            {searchTerm || filters.status || filters.specialty ? (
              <p>Try adjusting your search or filters</p>
            ) : (
              <p>Add your first candidate to get started</p>
            )}
            {searchTerm && (
              <button 
                className="btn-secondary"
                onClick={() => setSearchTerm('')}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Specialty</th>
                <th>Experience</th>
                <th>Preferred States</th>
                <th>Available</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr 
                  key={candidate.id}
                  className={editingCandidate === candidate.id ? 'editing-row' : ''}
                  onClick={() => navigate(`/candidates/${candidate.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {editingCandidate === candidate.id ? (
                    <>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="edit-name-group">
                          <input
                            type="text"
                            className="edit-input small"
                            value={editFormData.first_name}
                            onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                            placeholder="First Name"
                          />
                          <input
                            type="text"
                            className="edit-input small"
                            value={editFormData.last_name}
                            onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                            placeholder="Last Name"
                          />
                        </div>
                        <input
                          type="email"
                          className="edit-input"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                          placeholder="Email"
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          className="edit-input"
                          value={editFormData.primary_specialty}
                          onChange={(e) => setEditFormData({...editFormData, primary_specialty: e.target.value})}
                          placeholder="Specialty"
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          className="edit-input"
                          value={editFormData.years_experience}
                          onChange={(e) => setEditFormData({...editFormData, years_experience: e.target.value})}
                          placeholder="Years"
                        />
                      </td>
                      <td colSpan="2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="tel"
                          className="edit-input"
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                          placeholder="Phone"
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className="edit-select"
                          value={editFormData.candidate_status}
                          onChange={(e) => setEditFormData({...editFormData, candidate_status: e.target.value})}
                        >
                          <option value="active">Active</option>
                          <option value="placed">Placed</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="edit-actions">
                          <button 
                            className="btn-save-edit"
                            onClick={() => handleSaveEdit(candidate.id)}
                            title="Save Changes"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            className="btn-cancel-edit"
                            onClick={handleCancelEdit}
                            title="Cancel"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div className="candidate-info">
                          <div className="candidate-avatar">
                            {candidate.first_name[0]}{candidate.last_name[0]}
                          </div>
                          <div>
                            <div className="candidate-name">{candidate.full_name}</div>
                            <div className="candidate-email">{candidate.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{candidate.primary_specialty}</td>
                      <td>{candidate.years_experience} years</td>
                      <td>
                        <div className="states-list">
                          {candidate.preferred_states.slice(0, 3).map((state, idx) => (
                            <span key={idx} className="state-tag">{state}</span>
                          ))}
                          {candidate.preferred_states.length > 3 && (
                            <span className="state-tag">+{candidate.preferred_states.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>{candidate.availability_date || 'Not specified'}</td>
                      <td>
                        <span className={`status-badge status-${candidate.status}`}>
                          {candidate.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="actions-dropdown" ref={openDropdown === candidate.id ? dropdownRef : null}>
                          <button 
                            className="btn-actions"
                            onClick={(e) => toggleDropdown(candidate.id, e)}
                            title="Actions"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {openDropdown === candidate.id && (
                            <div className={`dropdown-menu ${dropdownPosition === 'top' ? 'dropdown-menu-up' : ''}`}>
                              <button 
                                className="dropdown-item"
                                onClick={() => handleEditInline(candidate)}
                              >
                                <Edit size={16} />
                                <span>Edit Inline</span>
                              </button>
                              
                              <button 
                                className="dropdown-item"
                                onClick={() => handleSendJobMatch(candidate)}
                              >
                                <Send size={16} />
                                <span>Find Job Matches</span>
                              </button>
                              
                              <button 
                                className="dropdown-item"
                                onClick={() => handleViewDocuments(candidate)}
                              >
                                <FileText size={16} />
                                <span>View Documents</span>
                              </button>
                              
                              <div className="dropdown-divider"></div>
                              
                              <button 
                                className="dropdown-item"
                                onClick={() => handleSendEmail(candidate)}
                              >
                                <Mail size={16} />
                                <span>Send Email</span>
                              </button>
                              
                              <div className="dropdown-divider"></div>
                              
                              {candidate.status !== 'active' && (
                                <button 
                                  className="dropdown-item status-action"
                                  onClick={() => handleChangeStatus(candidate, 'active')}
                                >
                                  <CheckCircle size={16} />
                                  <span>Mark as Active</span>
                                </button>
                              )}
                              
                              {candidate.status !== 'placed' && (
                                <button 
                                  className="dropdown-item status-action"
                                  onClick={() => handleChangeStatus(candidate, 'placed')}
                                >
                                  <CheckCircle size={16} />
                                  <span>Mark as Placed</span>
                                </button>
                              )}
                              
                              {candidate.status !== 'inactive' && (
                                <button 
                                  className="dropdown-item status-action"
                                  onClick={() => handleChangeStatus(candidate, 'inactive')}
                                >
                                  <XCircle size={16} />
                                  <span>Mark as Inactive</span>
                                </button>
                              )}
                              
                              <div className="dropdown-divider"></div>
                              
                              <button 
                                className="dropdown-item danger"
                                onClick={() => handleDelete(candidate)}
                              >
                                <Trash2 size={16} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CandidatesList;