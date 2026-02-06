import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Search, Filter, Plus, Eye, MapPin, DollarSign, Calendar } from 'lucide-react';
import { getJobs, getJobSpecialties } from '../services/api';
import './Jobs.css';

const JobsList = () => {
  const navigate = useNavigate();
  
  const [jobs, setJobs] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filters, setFilters] = useState({
    status: '',
    specialty: '',
    state: ''
  });

  // Load specialties when component mounts
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const response = await getJobSpecialties();
        setSpecialties(response.specialties || response.data?.specialties || []);
      } catch (error) {
        console.error('Error loading specialties:', error);
      }
    };
    
    loadSpecialties();
  }, []);

  // Load jobs whenever filters or search term changes
  useEffect(() => {
    loadJobs();
  }, [filters, searchTerm]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      
      // Build params object - only include non-empty values
      let params = {};
      
      // Add search term if present
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Add filters if present
      if (filters.status) {
        params.status = filters.status;
      }
      
      if (filters.specialty) {
        params.specialty = filters.specialty;
      }
      
      if (filters.state) {
        params.state = filters.state;
      }

      const response = await getJobs(params);
      
      setJobs(response.jobs || response.data?.jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadJobs();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      specialty: '',
      state: ''
    });
    setSearchTerm('');
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="jobs-page">
      <div className="page-header">
        <div>
          <h1><Briefcase size={28} /> Jobs</h1>
          <p className="page-subtitle">Manage open positions</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => navigate('/jobs/new')}
        >
          <Plus size={20} /> Post New Job
        </button>
      </div>

      {/* Search and Filters */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by specialty, facility, location, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-search">Search</button>
        </form>

        <div className="filters">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="filled">Filled</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filters.specialty}
            onChange={(e) => handleFilterChange('specialty', e.target.value)}
            className="filter-select"
          >
            <option value="">All Specialties</option>
            {specialties.map((specialty, index) => (
              <option key={index} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>

          {/* State Filter */}
          <input
            type="text"
            placeholder="State (e.g., CA)"
            value={filters.state}
            onChange={(e) => handleFilterChange('state', e.target.value.toUpperCase())}
            className="filter-select state-input"
            maxLength={2}
            style={{ width: '120px', textTransform: 'uppercase' }}
          />

          {/* Clear button */}
          {(filters.status || filters.specialty || filters.state || searchTerm) && (
            <button 
              className="btn-clear-filters"
              onClick={clearFilters}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="jobs-grid">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <Briefcase size={48} />
            <h3>No jobs found</h3>
            <p>
              {searchTerm || filters.status || filters.specialty || filters.state
                ? "Try adjusting your search or filters"
                : "No jobs available at the moment"}
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.job_id || job.id} className="job-card">
              <div className="job-header">
                <h3>{job.specialty_required}</h3>
                <span className={`status-badge status-${job.status?.toLowerCase() || 'open'}`}>
                  {job.status || 'Open'}
                </span>
              </div>
              
              <div className="job-details">
                <div className="detail-item">
                  <MapPin size={16} />
                  <span>{job.facility}, {job.state}</span>
                </div>
                
                <div className="detail-item">
                  <Calendar size={16} />
                  <span>{job.contract_weeks} weeks</span>
                </div>
                
                <div className="detail-item">
                  <DollarSign size={16} />
                  <span>{formatCurrency(job.pay_rate_weekly)}/week</span>
                </div>
              </div>
              
              <div className="job-meta">
                <span className="experience-req">
                  Min. {job.min_years_experience || 0} years exp.
                </span>
                <span className="start-date">
                  Starts: {job.start_date || 'TBD'}
                </span>
              </div>
              
              <div className="job-actions">
                <button
                  className="btn-view"
                  onClick={() => navigate(`/jobs/${job.job_id || job.id}`)}
                >
                  <Eye size={18} /> View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobsList;