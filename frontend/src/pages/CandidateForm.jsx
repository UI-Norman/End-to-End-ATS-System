import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Award, MapPin, Calendar, Briefcase } from 'lucide-react';
import { createCandidate } from '../services/api';
import './CandidateForm.css';

const CandidateForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    primary_specialty: '',
    years_experience: '',
    preferred_states: [],
    availability_date: '',
    desired_contract_weeks: '13',
    candidate_status: 'active'
  });

  // List of all US states
  const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  // Common healthcare specialties
  const SPECIALTIES = [
    'Registered Nurse (RN)',
    'Licensed Practical Nurse (LPN)',
    'Certified Nursing Assistant (CNA)',
    'Emergency Room Nurse',
    'Intensive Care Unit (ICU) Nurse',
    'Operating Room (OR) Nurse',
    'Labor & Delivery Nurse',
    'Pediatric Nurse',
    'Medical-Surgical Nurse',
    'Telemetry Nurse',
    'Step-Down Nurse',
    'Physical Therapist',
    'Occupational Therapist',
    'Speech Language Pathologist',
    'Respiratory Therapist',
    'Radiology Technologist',
    'Ultrasound Technologist',
    'Surgical Technologist',
    'Medical Laboratory Technician',
    'Pharmacy Technician',
    'Other'
  ];

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle state selection (multi-select)
  const handleStateToggle = (state) => {
    setFormData(prev => {
      const states = [...prev.preferred_states];
      const index = states.indexOf(state);
      
      if (index > -1) {
        // Remove state
        states.splice(index, 1);
      } else {
        // Add state
        states.push(state);
      }
      
      return {
        ...prev,
        preferred_states: states
      };
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Prepare data
      const candidateData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        primary_specialty: formData.primary_specialty,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        preferred_states: formData.preferred_states,
        availability_date: formData.availability_date || null,
        desired_contract_weeks: formData.desired_contract_weeks ? parseInt(formData.desired_contract_weeks) : 13,
        candidate_status: formData.candidate_status
      };

      // Validate required fields
      if (!candidateData.first_name || !candidateData.last_name || !candidateData.email || !candidateData.primary_specialty) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Call API
      const response = await createCandidate(candidateData);
      
      console.log('Candidate created:', response.data);

      // Success - redirect to candidates list
      alert('Candidate created successfully!');
      navigate('/candidates');

    } catch (err) {
      console.error('Error creating candidate:', err);
      setError(err.response?.data?.detail || 'Failed to create candidate. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="candidate-form-page">
      <div className="form-header">
        <button className="btn-back" onClick={() => navigate('/candidates')}>
          <ArrowLeft size={20} />
          Back to Candidates
        </button>
        <h1>
          <User size={28} />
          Add New Candidate
        </h1>
        <p className="form-subtitle">Fill in the candidate's information below</p>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          {/* Error Message */}
          {error && (
            <div className="error-banner">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Personal Information Section */}
          <div className="form-section">
            <h3>
              <User size={20} />
              Personal Information
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name">
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">
                  <Mail size={16} />
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  <Phone size={16} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Information Section */}
          <div className="form-section">
            <h3>
              <Award size={20} />
              Professional Information
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="primary_specialty">
                  Primary Specialty <span className="required">*</span>
                </label>
                <select
                  id="primary_specialty"
                  name="primary_specialty"
                  value={formData.primary_specialty}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select Specialty --</option>
                  {SPECIALTIES.map(specialty => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="years_experience">
                  <Briefcase size={16} />
                  Years of Experience
                </label>
                <input
                  type="number"
                  id="years_experience"
                  name="years_experience"
                  value={formData.years_experience}
                  onChange={handleChange}
                  min="0"
                  max="50"
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="form-section">
            <h3>
              <MapPin size={20} />
              Work Preferences
            </h3>

            <div className="form-group">
              <label>
                Preferred States
              </label>
              <p className="field-hint">Select all states where the candidate is willing to work</p>
              <div className="states-grid">
                {US_STATES.map(state => (
                  <button
                    key={state}
                    type="button"
                    className={`state-chip ${formData.preferred_states.includes(state) ? 'selected' : ''}`}
                    onClick={() => handleStateToggle(state)}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="availability_date">
                  <Calendar size={16} />
                  Availability Date
                </label>
                <input
                  type="date"
                  id="availability_date"
                  name="availability_date"
                  value={formData.availability_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="desired_contract_weeks">
                  Contract Duration (weeks)
                </label>
                <input
                  type="number"
                  id="desired_contract_weeks"
                  name="desired_contract_weeks"
                  value={formData.desired_contract_weeks}
                  onChange={handleChange}
                  min="1"
                  max="52"
                  placeholder="13"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="candidate_status">
                Status
              </label>
              <select
                id="candidate_status"
                name="candidate_status"
                value={formData.candidate_status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="placed">Placed</option>
              </select>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate('/candidates')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateForm;