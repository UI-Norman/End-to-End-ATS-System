import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowLeft, Save } from 'lucide-react';
import { createJob } from '../services/api';
import './Jobs.css';

const JobForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    specialty_required: '',
    facility: '',
    facility_type: '',
    city: '',
    state: '',
    zip_code: '',
    shift_type: '',
    shift_length: '',
    schedule: '',
    min_years_experience: 0,
    contract_weeks: 13,
    start_date: '',
    positions_available: 1,
    pay_rate_weekly: '',
    pay_rate_hourly: '',
    housing_stipend: '',
    per_diem_daily: '',
    status: 'open',
    urgency_level: 'normal',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await createJob(formData);
      alert('Job posted successfully!');
      navigate('/jobs');
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jobs-page">
      <div className="page-header">
        <div>
          <h1><Briefcase size={28} /> Post New Job</h1>
          <p className="page-subtitle">Create a new job posting</p>
        </div>
      </div>

      <button onClick={() => navigate('/jobs')} className="btn-back">
        <ArrowLeft size={20} /> Back to Jobs
      </button>

      <div className="table-container" style={{ marginTop: '20px' }}>
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          
          {/* Basic Information */}
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Basic Information</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group">
              <label>Job Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Registered Nurse - ICU"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>

            <div className="form-group">
              <label>Specialty Required *</label>
              <select
                name="specialty_required"
                value={formData.specialty_required}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              >
                <option value="">Select Specialty</option>
                <option value="Registered Nurse">Registered Nurse</option>
                <option value="ICU Nurse">ICU Nurse</option>
                <option value="ER Nurse">ER Nurse</option>
                <option value="OR Nurse">OR Nurse</option>
                <option value="Medical-Surgical Nurse">Medical-Surgical Nurse</option>
                <option value="Pediatric Nurse">Pediatric Nurse</option>
                <option value="NICU Nurse">NICU Nurse</option>
                <option value="Physical Therapist">Physical Therapist</option>
                <option value="Occupational Therapist">Occupational Therapist</option>
                <option value="Speech Therapist">Speech Therapist</option>
                <option value="Respiratory Therapist">Respiratory Therapist</option>
              </select>
            </div>
          </div>

          {/* Facility Information */}
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Facility Information</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group">
              <label>Facility Name *</label>
              <input
                type="text"
                name="facility"
                value={formData.facility}
                onChange={handleChange}
                placeholder="e.g., City General Hospital"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>

            <div className="form-group">
              <label>Facility Type</label>
              <select
                name="facility_type"
                value={formData.facility_type}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              >
                <option value="">Select Type</option>
                <option value="Hospital">Hospital</option>
                <option value="Clinic">Clinic</option>
                <option value="Nursing Home">Nursing Home</option>
                <option value="Rehabilitation Center">Rehabilitation Center</option>
                <option value="Urgent Care">Urgent Care</option>
              </select>
            </div>

            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Los Angeles"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>

            <div className="form-group">
              <label>State *</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g., CA"
                maxLength="2"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>
          </div>

          {/* Shift Information */}
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Shift & Schedule</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group">
              <label>Shift Type</label>
              <select
                name="shift_type"
                value={formData.shift_type}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              >
                <option value="">Select Shift</option>
                <option value="Day">Day</option>
                <option value="Night">Night</option>
                <option value="Evening">Evening</option>
                <option value="Rotating">Rotating</option>
              </select>
            </div>

            <div className="form-group">
              <label>Shift Length</label>
              <select
                name="shift_length"
                value={formData.shift_length}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              >
                <option value="">Select Length</option>
                <option value="8 hours">8 hours</option>
                <option value="10 hours">10 hours</option>
                <option value="12 hours">12 hours</option>
              </select>
            </div>

            <div className="form-group">
              <label>Schedule</label>
              <input
                type="text"
                name="schedule"
                value={formData.schedule}
                onChange={handleChange}
                placeholder="e.g., 3x12"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>
          </div>

          {/* Contract Details */}
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Contract Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group">
              <label>Contract Duration (weeks) *</label>
              <input
                type="number"
                name="contract_weeks"
                value={formData.contract_weeks}
                onChange={handleChange}
                min="1"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>

            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>

            <div className="form-group">
              <label>Positions Available</label>
              <input
                type="number"
                name="positions_available"
                value={formData.positions_available}
                onChange={handleChange}
                min="1"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>

            <div className="form-group">
              <label>Min. Years Experience</label>
              <input
                type="number"
                name="min_years_experience"
                value={formData.min_years_experience}
                onChange={handleChange}
                min="0"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>
          </div>

          {/* Compensation */}
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Compensation</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group">
              <label>Weekly Pay Rate</label>
              <input
                type="number"
                name="pay_rate_weekly"
                value={formData.pay_rate_weekly}
                onChange={handleChange}
                placeholder="e.g., 2500"
                step="0.01"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>

            <div className="form-group">
              <label>Hourly Pay Rate</label>
              <input
                type="number"
                name="pay_rate_hourly"
                value={formData.pay_rate_hourly}
                onChange={handleChange}
                placeholder="e.g., 45"
                step="0.01"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>

            <div className="form-group">
              <label>Housing Stipend (weekly)</label>
              <input
                type="number"
                name="housing_stipend"
                value={formData.housing_stipend}
                onChange={handleChange}
                placeholder="e.g., 500"
                step="0.01"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>

            <div className="form-group">
              <label>Per Diem (daily)</label>
              <input
                type="number"
                name="per_diem_daily"
                value={formData.per_diem_daily}
                onChange={handleChange}
                placeholder="e.g., 50"
                step="0.01"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              />
            </div>
          </div>

          {/* Status */}
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Job Status</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              >
                <option value="open">Open</option>
                <option value="filled">Filled</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Urgency Level</label>
              <select
                name="urgency_level"
                value={formData.urgency_level}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/jobs')}
              className="btn-cancel"
              style={{ 
                padding: '12px 24px', 
                borderRadius: '8px', 
                border: '2px solid #d1d5db',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px'
              }}
            >
              <Save size={20} />
              {loading ? 'Posting...' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobForm;