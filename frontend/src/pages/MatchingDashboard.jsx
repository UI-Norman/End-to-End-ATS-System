import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Users, Briefcase, TrendingUp, Send, Eye, CheckCircle, XCircle } from 'lucide-react';
import { 
  getEndingAssignmentsWithMatches,
  getMatchesForJob,
  getMatchesForCandidate,
  getCandidate,
  getJob,
  sendEmailToCandidate,
  getCandidates,
  getJobs
} from '../services/api';
import EmailModal from './EmailModal';
import './MatchingDashboard.css';

const MatchingDashboard = () => {
  const navigate = useNavigate();
  const [endingAssignments, setEndingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('ending');  

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    loadEndingAssignments();
  }, []);

  const loadEndingAssignments = async () => {
    try {
      setLoading(true);
      const response = await getEndingAssignmentsWithMatches(28);
      
      const assignments = response.data.ending_assignments || [];
      
      const transformedAssignments = assignments.map(item => ({
        assignment_id: item.assignment?.assignment_id || item.assignment?.id,
        candidate_id: item.candidate?.id,
        candidate_name: item.candidate?.full_name,
        current_facility: item.assignment?.location || 'N/A',
        end_date: item.assignment?.end_date,
        days_remaining: item.days_remaining,
        potential_matches_count: item.potential_matches,
        top_matches: []
      }));
      
      setEndingAssignments(transformedAssignments);
    } catch (error) {
      console.error('Error loading ending assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOpportunity = async (candidateId, jobId) => {
    try {
      if (!candidateId || !jobId) {
        alert("Cannot send opportunity: missing candidate or job information.");
        return;
      }

      console.log('📧 Opening email modal for:', { candidateId, jobId });
      const [candidateResponse, jobResponse] = await Promise.all([
        getCandidate(candidateId),
        getJob(jobId)
      ]);

      const candidateData = candidateResponse?.data;
      const jobData = jobResponse?.data;

      if (!candidateData || !jobData) {
        alert("Failed to load candidate or job details.");
        return;
      }

      console.log('✅ Loaded candidate:', candidateData);
      console.log('✅ Loaded job:', jobData);

      setSelectedCandidate(candidateData);
      setSelectedJob(jobData);
      setEmailModalOpen(true);
    } catch (error) {
      console.error('❌ Error loading candidate/job details:', error);
      alert('Failed to load details: ' + (error.message || 'Unknown error'));
    }
  };

  /**
   * Actually send the email via API
   */
  const handleSendEmail = async (emailData) => {
    try {
      console.log('📤 Sending email with this data:', emailData);
      
      // Make sure we send the correct field name that backend expects
      const payload = {
        ...emailData,
        message: emailData.message || emailData.custom_message || '',  
      };

      // Clean up old field name if present
      if (payload.custom_message) delete payload.custom_message;

      await sendEmailToCandidate(payload);
      alert('✅ Email sent successfully!');
    } catch (error) {
      console.error('❌ Error sending email:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      const errorMsg = error.response?.data?.detail 
        || error.message 
        || 'Failed to send email. Please try again.';
        
      alert(errorMsg);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading matching insights...</p>
      </div>
    );
  }

  return (
    <div className="matching-dashboard">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><Target size={28} /> Intelligent Matching Dashboard</h1>
          <p className="page-subtitle">Proactive matching powered by AI</p>
        </div>
        <button className="btn-primary" onClick={loadEndingAssignments}>
          <TrendingUp size={20} /> Refresh Matches
        </button>
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        <button 
          className={`tab ${selectedView === 'ending' ? 'active' : ''}`}
          onClick={() => setSelectedView('ending')}
        >
          <TrendingUp size={18} />
          Ending Assignments ({endingAssignments.length})
        </button>
        <button 
          className={`tab ${selectedView === 'jobs' ? 'active' : ''}`}
          onClick={() => setSelectedView('jobs')}
        >
          <Briefcase size={18} />
          Match by Job
        </button>
        <button 
          className={`tab ${selectedView === 'candidates' ? 'active' : ''}`}
          onClick={() => setSelectedView('candidates')}
        >
          <Users size={18} />
          Match by Candidate
        </button>
      </div>

      {/* Main Content */}
      {selectedView === 'ending' && (
        <div className="ending-assignments-section">
          {endingAssignments.length === 0 ? (
            <div className="empty-state">
              <TrendingUp size={64} />
              <h3>No assignments ending soon</h3>
              <p>All travelers are on long-term assignments</p>
            </div>
          ) : (
            <div className="assignments-grid">
              {endingAssignments.map(assignment => (
                <EndingAssignmentCard 
                  key={assignment.assignment_id}
                  assignment={assignment}
                  onSendOpportunity={handleSendOpportunity}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedView === 'jobs' && (
        <div className="match-by-job-section">
          <JobMatchingView 
            navigate={navigate}
            onSendOpportunity={handleSendOpportunity}
          />
        </div>
      )}

      {selectedView === 'candidates' && (
        <div className="match-by-candidate-section">
          <CandidateMatchingView 
            navigate={navigate}
            onSendOpportunity={handleSendOpportunity}
          />
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        candidate={selectedCandidate}
        job={selectedJob}
        onSend={handleSendEmail}
      />
    </div>
  );
};

// ==================== ENDING ASSIGNMENT CARD ====================

const EndingAssignmentCard = ({ assignment, onSendOpportunity, navigate }) => {
  const [expanded, setExpanded] = useState(false);
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Load matches when card is expanded
  const loadMatches = async () => {
    if (matches.length > 0) return; // Already loaded
    
    try {
      setLoadingMatches(true);
      const response = await getMatchesForCandidate(assignment.candidate_id, 20);
      setMatches(response.data.matches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleExpand = () => {
    if (!expanded && matches.length === 0) {
      loadMatches();
    }
    setExpanded(!expanded);
  };

  const getDaysColor = (days) => {
    if (days <= 7) return 'critical';
    if (days <= 14) return 'urgent';
    if (days <= 21) return 'warning';
    return 'normal';
  };

  return (
    <div className="assignment-card">
      <div className="card-header">
        <div className="candidate-info">
          <div className="candidate-avatar">
            {assignment.candidate_name?.charAt(0) || '?'}
          </div>
          <div>
            <h3>{assignment.candidate_name || 'Unknown'}</h3>
            <p className="current-assignment">
              Currently at {assignment.current_facility}
            </p>
          </div>
        </div>
        <div className={`days-badge ${getDaysColor(assignment.days_remaining)}`}>
          {assignment.days_remaining} days
        </div>
      </div>

      <div className="assignment-meta">
        <div className="meta-item">
          <span className="label">End Date:</span>
          <span className="value">{assignment.end_date}</span>
        </div>
        <div className="meta-item">
          <span className="label">Potential Matches:</span>
          <span className="value">{assignment.potential_matches_count || 0}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="assignment-actions">
        <button 
          className="btn-secondary"
          onClick={() => navigate(`/candidates/${assignment.candidate_id}`)}
        >
          <Eye size={16} />
          View Candidate
        </button>
      </div>

      {/* Top Matches */}
      <div className="matches-section">
        <div className="matches-header" onClick={handleExpand}>
          <h4>Top Opportunities {matches.length > 0 ? `(${matches.length})` : ''}</h4>
          <button className="btn-toggle">
            {expanded ? '▼' : '▶'}
          </button>
        </div>

        {expanded && (
          <div className="matches-list">
            {loadingMatches ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Finding matches...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="empty-state">
                <p>No matches found</p>
              </div>
            ) : (
              matches.slice(0, 5).map((match, idx) => (
                <div key={match.job_id} className="match-item">
                  <div className="match-rank">#{idx + 1}</div>
                  <div className="match-info">
                    <h5>{match.title || match.specialty_required}</h5>
                    <p>{match.facility}, {match.state}</p>
                  </div>
                  <CircularScore score={match.score} />
                  <div className="match-actions">
                    <button 
                      className="btn-send" 
                      onClick={() => {
                        // Debug: confirm click
                        console.log("Send Opportunity clicked in Ending Card", {
                          candidateId: assignment.candidate_id,
                          jobId: match.job_id
                        });
                        onSendOpportunity(assignment.candidate_id, match.job_id);
                      }}
                      title="Send this opportunity to candidate"
                    >
                      <Send size={16} />
                    </button>
                    <button 
                      className="btn-view"
                      onClick={() => navigate(`/jobs/${match.job_id}`)}
                      title="View job details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== JOB MATCHING VIEW ====================

const JobMatchingView = ({ navigate, onSendOpportunity }) => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const response = await getJobs({ status: 'open' });
      const jobsData = response.data.jobs || response.data || [];
      setJobs(jobsData);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadMatches = async (jobId) => {
    setSelectedJob(jobId);
    setLoading(true);
    
    try {
      const response = await getMatchesForJob(jobId, 20);
      const matchesData = response.data.matches || [];
      setMatches(matchesData);
    } catch (error) {
      console.error("Error loading job matches:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-matching-view">
      <div className="jobs-list">
        <h3>Open Positions</h3>
        {jobs.length === 0 ? (
          <div className="empty-state-small">
            <p>No open positions</p>
          </div>
        ) : (
          jobs.map(job => (
            <div 
              key={job.job_id}
              className={`job-item ${selectedJob === job.job_id ? 'active' : ''}`}
              onClick={() => loadMatches(job.job_id)}
            >
              <h4>{job.title || job.specialty_required}</h4>
              <p>{job.facility}, {job.state}</p>
            </div>
          ))
        )}
      </div>

      <div className="matches-panel">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Finding matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="empty-state">
            <Target size={48} />
            <p>Select a job to see candidate matches</p>
          </div>
        ) : (
          <div className="matches-results">
            <h3>Top {matches.length} Candidate Matches</h3>
            {matches.map((match, idx) => (
              <MatchCard 
                key={match.candidate_id} 
                match={match} 
                rank={idx + 1} 
                navigate={navigate}
                onSendOpportunity={onSendOpportunity}
                jobId={selectedJob}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== CANDIDATE MATCHING VIEW ====================

const CandidateMatchingView = ({ navigate, onSendOpportunity }) => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const response = await getCandidates({ status: 'active' });
      const candidatesData = response.data.candidates || response.data || [];
      setCandidates(candidatesData);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const loadMatches = async (candidateId) => {
    setSelectedCandidate(candidateId);
    setLoading(true);
    
    try {
      const response = await getMatchesForCandidate(candidateId, 20);
      const matchesData = response.data.matches || [];
      setMatches(matchesData);
    } catch (error) {
      console.error("Error loading candidate matches:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="candidate-matching-view">
      <div className="candidates-list">
        <h3>Active Candidates</h3>
        {candidates.length === 0 ? (
          <div className="empty-state-small">
            <p>No active candidates</p>
          </div>
        ) : (
          candidates.map(candidate => (
            <div 
              key={candidate.candidate_id}
              className={`candidate-item ${selectedCandidate === candidate.candidate_id ? 'active' : ''}`}
              onClick={() => loadMatches(candidate.candidate_id)}
            >
              <div className="candidate-avatar">
                {candidate.first_name?.[0]}{candidate.last_name?.[0]}
              </div>
              <div>
                <h4>{candidate.full_name}</h4>
                <p>{candidate.primary_specialty}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="matches-panel">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Finding matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="empty-state">
            <Target size={48} />
            <p>Select a candidate to see job matches</p>
          </div>
        ) : (
          <div className="matches-results">
            <h3>Top {matches.length} Job Matches</h3>
            {matches.map((match, idx) => (
              <JobMatchCard 
                key={match.job_id} 
                match={match} 
                rank={idx + 1} 
                navigate={navigate}
                onSendOpportunity={onSendOpportunity}
                candidateId={selectedCandidate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== REUSABLE COMPONENTS ====================

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
        <circle
          cx="25"
          cy="25"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        <circle
          cx="25"
          cy="25"
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 25 25)"
        />
      </svg>
      <span className="score-text">{score}%</span>
    </div>
  );
};

const MatchCard = ({ match, rank, navigate, onSendOpportunity, jobId }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="match-card-detailed">
      <div className="match-header">
        <div className="match-rank-badge">#{rank}</div>
        <div className="match-candidate-info">
          <h4>{match.candidate_name || match.full_name}</h4>
          <p>{match.email} • {match.phone || 'No phone'}</p>
        </div>
        <CircularScore score={match.score} />
      </div>

      <div className="match-details-toggle" onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? 'Hide' : 'Show'} Details</span>
        <span>{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="match-details-content">
          <div className="match-reasons">
            <h5>Why this is a good match:</h5>
            {match.match_details?.reasons?.map((reason, idx) => (
              <div key={idx} className="reason-item">
                <CheckCircle size={16} className="check-icon" />
                <span>{reason}</span>
              </div>
            ))}
          </div>

          {match.match_details?.concerns && match.match_details.concerns.length > 0 && (
            <div className="match-concerns">
              <h5>Considerations:</h5>
              {match.match_details.concerns.map((concern, idx) => (
                <div key={idx} className="concern-item">
                  <XCircle size={16} className="alert-icon" />
                  <span>{concern}</span>
                </div>
              ))}
            </div>
          )}

          {match.rule_notes && match.rule_notes.length > 0 && (
            <div className="rule-notes">
              <h5>Matching Rules Applied:</h5>
              {match.rule_notes.map((note, idx) => (
                <div key={idx} className="note-item">{note}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="match-actions">
        <button 
          className="btn-secondary" 
          onClick={() => navigate(`/candidates/${match.candidate_id}`)}
          title="View full candidate profile"
        >
          <Users size={16} />
          View Profile
        </button>
        <button 
          className="btn-primary"
          onClick={() => onSendOpportunity(match.candidate_id, jobId)}
          title="Send job opportunity email to candidate"
        >
          <Send size={16} />
          Send Opportunity
        </button>
      </div>
    </div>
  );
};

const JobMatchCard = ({ match, rank, navigate, onSendOpportunity, candidateId }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="match-card-detailed">
      <div className="match-header">
        <div className="match-rank-badge">#{rank}</div>
        <div className="match-job-info">
          <h4>{match.title || match.specialty_required}</h4>
          <p>{match.facility}, {match.state}</p>
        </div>
        <CircularScore score={match.score} />
      </div>

      <div className="job-quick-info">
        <div className="info-item">
          <span className="label">Pay:</span>
          <span className="value">${match.pay_rate_weekly || 'N/A'}/week</span>
        </div>
        <div className="info-item">
          <span className="label">Start:</span>
          <span className="value">{match.start_date || 'Flexible'}</span>
        </div>
        <div className="info-item">
          <span className="label">Specialty:</span>
          <span className="value">{match.specialty_required}</span>
        </div>
      </div>

      <div className="match-details-toggle" onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? 'Hide' : 'Show'} Details</span>
        <span>{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="match-details-content">
          <div className="match-reasons">
            <h5>Why this is a good match:</h5>
            {match.match_details?.reasons?.map((reason, idx) => (
              <div key={idx} className="reason-item">
                <CheckCircle size={16} className="check-icon" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="match-actions">
        <button 
          className="btn-secondary" 
          onClick={() => {
            navigate(`/jobs/${match.job_id}`);
          }}
          title="View full job details with all information"
        >
          <Briefcase size={16} />
          View Job Details
        </button>
        <button 
          className="btn-primary"
          onClick={() => onSendOpportunity(candidateId, match.job_id)}
          title="Send this job to candidate via email"
        >
          <Send size={16} />
          Send to Candidate
        </button>
      </div>
    </div>
  );
};

export default MatchingDashboard;