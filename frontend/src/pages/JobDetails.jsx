import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Briefcase, MapPin, Calendar, DollarSign, Clock, 
  Users, Award, Home, ArrowLeft, AlertCircle, CheckCircle,
  TrendingUp, Star, Building, Phone
} from 'lucide-react';
import { getJob, getMatchesForJob } from '../services/api';
import './JobDetails.css';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    loadJobDetails();
    loadMatches();
  }, [id]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const response = await getJob(id);
      setJob(response.data);
    } catch (error) {
      console.error('Error loading job details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      const response = await getMatchesForJob(id, 50);
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="error-container">
        <AlertCircle size={48} />
        <h2>Job Not Found</h2>
        <button onClick={() => navigate('/jobs')} className="btn-primary">
          Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="job-details-page">
      {/* Header */}
      <div className="details-header">
        <button onClick={() => navigate('/jobs')} className="btn-back">
          <ArrowLeft size={20} /> Back to Jobs
        </button>
        <div className="header-content">
          <div className="header-left">
            <h1>{job.title || job.specialty_required}</h1>
            <div className="job-meta">
              <span className="meta-item">
                <Building size={16} /> {job.facility}
              </span>
              <span className="meta-item">
                <MapPin size={16} /> {job.city}, {job.state}
              </span>
              <span className={`status-badge status-${job.status}`}>
                {job.status}
              </span>
              {job.urgency_level && job.urgency_level !== 'normal' && (
                <span className={`urgency-badge urgency-${job.urgency_level}`}>
                  {job.urgency_level}
                </span>
              )}
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-primary">
              <Users size={18} /> View Matches ({matches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <DollarSign className="stat-icon" />
          <div>
            <div className="stat-value">{formatCurrency(job.pay_rate_weekly)}</div>
            <div className="stat-label">Weekly Pay</div>
          </div>
        </div>
        <div className="stat-card">
          <Calendar className="stat-icon" />
          <div>
            <div className="stat-value">{job.contract_weeks || 'N/A'} weeks</div>
            <div className="stat-label">Contract Length</div>
          </div>
        </div>
        <div className="stat-card">
          <Clock className="stat-icon" />
          <div>
            <div className="stat-value">{job.shift_type || 'N/A'}</div>
            <div className="stat-label">Shift Type</div>
          </div>
        </div>
        <div className="stat-card">
          <Award className="stat-icon" />
          <div>
            <div className="stat-value">{job.min_years_experience || 0}+ years</div>
            <div className="stat-label">Experience Required</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Job Details
        </button>
        <button 
          className={`tab ${activeTab === 'compensation' ? 'active' : ''}`}
          onClick={() => setActiveTab('compensation')}
        >
          Compensation & Benefits
        </button>
        <button 
          className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Matches ({matches.length})
        </button>
        <button 
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments ({job.assignments_count})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'details' && (
          <div className="details-grid">
            {/* Location & Facility */}
            <div className="detail-section">
              <h3><MapPin size={20} /> Location & Facility</h3>
              <div className="detail-rows">
                <DetailRow label="Facility" value={job.facility} />
                <DetailRow label="Facility Type" value={job.facility_type} />
                <DetailRow label="City" value={job.city} />
                <DetailRow label="State" value={job.state} />
                <DetailRow label="ZIP Code" value={job.zip_code} />
                {job.facility_rating && (
                  <DetailRow 
                    label="Facility Rating" 
                    value={
                      <div className="rating">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            fill={i < job.facility_rating ? '#FFD700' : 'none'}
                            color={i < job.facility_rating ? '#FFD700' : '#ccc'}
                          />
                        ))}
                        <span className="rating-text">{job.facility_rating}/5</span>
                      </div>
                    } 
                  />
                )}
              </div>
            </div>

            {/* Shift & Schedule */}
            <div className="detail-section">
              <h3><Clock size={20} /> Shift & Schedule</h3>
              <div className="detail-rows">
                <DetailRow label="Shift Type" value={job.shift_type} />
                <DetailRow label="Shift Length" value={job.shift_length} />
                <DetailRow label="Schedule" value={job.schedule} />
                <DetailRow 
                  label="Floating Required" 
                  value={job.floating_required ? 'Yes' : 'No'} 
                  icon={job.floating_required ? <CheckCircle size={16} color="#50C878" /> : null}
                />
                <DetailRow 
                  label="On-Call Required" 
                  value={job.call_required ? 'Yes' : 'No'} 
                  icon={job.call_required ? <CheckCircle size={16} color="#50C878" /> : null}
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="detail-section">
              <h3><Award size={20} /> Requirements</h3>
              <div className="detail-rows">
                <DetailRow label="Primary Specialty" value={job.specialty_required} />
                <DetailRow label="Min Experience" value={`${job.min_years_experience || 0} years`} />
                {job.required_certifications && job.required_certifications.length > 0 && (
                  <DetailRow 
                    label="Required Certifications" 
                    value={
                      <div className="tags-list">
                        {job.required_certifications.map((cert, idx) => (
                          <span key={idx} className="tag">{cert}</span>
                        ))}
                      </div>
                    } 
                  />
                )}
                {job.required_licenses && job.required_licenses.length > 0 && (
                  <DetailRow 
                    label="Required Licenses" 
                    value={
                      <div className="tags-list">
                        {job.required_licenses.map((license, idx) => (
                          <span key={idx} className="tag">{license}</span>
                        ))}
                      </div>
                    } 
                  />
                )}
                {job.special_requirements && (
                  <DetailRow label="Special Requirements" value={job.special_requirements} />
                )}
              </div>
            </div>

            {/* Contract Details */}
            <div className="detail-section">
              <h3><Calendar size={20} /> Contract Details</h3>
              <div className="detail-rows">
                <DetailRow label="Start Date" value={job.start_date || 'Flexible'} />
                <DetailRow label="Contract Duration" value={`${job.contract_weeks || 'N/A'} weeks`} />
                <DetailRow label="Positions Available" value={job.positions_available || 1} />
                <DetailRow 
                  label="Extension Possible" 
                  value={job.extension_possible ? 'Yes' : 'No'} 
                  icon={job.extension_possible ? <CheckCircle size={16} color="#50C878" /> : null}
                />
              </div>
            </div>

            {/* Facility Details */}
            {(job.unit_details || job.patient_ratio || job.parking || job.scrub_color) && (
              <div className="detail-section full-width">
                <h3><Building size={20} /> Facility Details</h3>
                <div className="detail-rows">
                  {job.unit_details && <DetailRow label="Unit Details" value={job.unit_details} />}
                  {job.patient_ratio && <DetailRow label="Patient Ratio" value={job.patient_ratio} />}
                  {job.parking && <DetailRow label="Parking" value={job.parking} />}
                  {job.scrub_color && <DetailRow label="Scrub Color" value={job.scrub_color} />}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compensation' && (
          <div className="compensation-content">
            <div className="comp-section">
              <h3><DollarSign size={20} /> Base Compensation</h3>
              <div className="detail-rows">
                <DetailRow label="Weekly Pay Rate" value={formatCurrency(job.pay_rate_weekly)} highlighted />
                <DetailRow label="Hourly Pay Rate" value={formatCurrency(job.pay_rate_hourly)} />
                <DetailRow label="Overtime Rate" value={formatCurrency(job.overtime_rate)} />
              </div>
            </div>

            <div className="comp-section">
              <h3><Home size={20} /> Stipends & Reimbursements</h3>
              <div className="detail-rows">
                <DetailRow label="Housing Stipend" value={formatCurrency(job.housing_stipend)} />
                <DetailRow label="Per Diem (Daily)" value={formatCurrency(job.per_diem_daily)} />
                <DetailRow label="Travel Reimbursement" value={formatCurrency(job.travel_reimbursement)} />
              </div>
            </div>

            <div className="comp-section">
              <h3><TrendingUp size={20} /> Bonuses</h3>
              <div className="detail-rows">
                <DetailRow label="Sign-On Bonus" value={formatCurrency(job.sign_on_bonus)} />
                <DetailRow label="Completion Bonus" value={formatCurrency(job.completion_bonus)} />
              </div>
            </div>

            {job.benefits && job.benefits.length > 0 && (
              <div className="comp-section full-width">
                <h3><CheckCircle size={20} /> Benefits</h3>
                <div className="benefits-list">
                  {job.benefits.map((benefit, idx) => (
                    <div key={idx} className="benefit-item">
                      <CheckCircle size={16} color="#50C878" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="matches-content">
            {matches.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <h3>No matches found</h3>
                <p>No candidates currently match this job</p>
              </div>
            ) : (
              <div className="matches-list">
                {matches.map(match => (
                  <div key={match.candidate_id} className="match-card">
                    <div className="match-header">
                      <div className="candidate-avatar">
                        {match.full_name.charAt(0)}
                      </div>
                      <div className="match-info">
                        <h4>{match.full_name}</h4>
                        <p>{match.primary_specialty} • {match.years_experience} years experience</p>
                      </div>
                      <div className="match-score">
                        <div className="score-circle" style={{
                          background: `conic-gradient(#50C878 ${match.score * 3.6}deg, #e2e8f0 0deg)`
                        }}>
                          <span>{match.score}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="match-details">
                      <div className="detail-item">
                        <Phone size={14} />
                        <span>{match.phone || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <MapPin size={14} />
                        <span>{match.email}</span>
                      </div>
                    </div>
                    <button 
                      className="btn-view-candidate"
                      onClick={() => navigate(`/candidates/${match.candidate_id}`)}
                    >
                      View Candidate
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="assignments-content">
            {job.assignments_count === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <h3>No assignments yet</h3>
                <p>No candidates have been assigned to this job</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {job.assignments.map(assignment => (
                    <tr key={assignment.assignment_id}>
                      <td>{assignment.candidate_name}</td>
                      <td>{assignment.start_date || 'N/A'}</td>
                      <td>{assignment.end_date || 'N/A'}</td>
                      <td>
                        <span className={`status-badge status-${assignment.status}`}>
                          {assignment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, icon, highlighted }) => (
  <div className={`detail-row ${highlighted ? 'highlighted' : ''}`}>
    <span className="detail-label">{label}</span>
    <span className="detail-value">
      {icon && icon}
      {value || 'N/A'}
    </span>
  </div>
);

export default JobDetails;