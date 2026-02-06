import React, { useState } from 'react';
import './EmailModal.css';
const EmailModal = ({ isOpen, onClose, candidate, job, onSend }) => {
  const [formData, setFormData] = useState(() => ({
    subject: job
      ? `Exciting Travel Healthcare Opportunity: ${job.title || 'Position'} in ${job.city || job.state || 'Location'}`
      : 'Exciting Travel Healthcare Opportunity',
    message: '',
    includeJobDetails: true
  }));
  
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Don't render if modal is not open
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      const emailData = {
        to_email: candidate?.email,
        candidate_name: `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim(),
        subject: formData.subject,
        custom_message: formData.message,
        // Safely access job properties – send empty/fallback values if job is null
        job_title: job?.title || null,
        facility_name: job?.facility_name || job?.facility || null,
        location: job?.city || job?.state 
          ? `${job.city || ''}${job.city && job.state ? ', ' : ''}${job.state || ''}`.trim() || null
          : null,
        pay_rate: job?.pay_package || null,
        start_date: job?.start_date || null,
        recruiter_name: null,  
        recruiter_email: null,  
        recruiter_phone: null  
      };

      await onSend(emailData);
      onClose();
      
      // Reset form
      setFormData({
        subject: job
          ? `Exciting Travel Healthcare Opportunity: ${job.title || 'Position'} in ${job.city || job.state || 'Location'}`
          : 'Exciting Travel Healthcare Opportunity',
        message: '',
        includeJobDetails: true
      });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📧 Send Job Opportunity</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Recipient Info */}
          <div className="recipient-info">
            <div className="recipient-avatar">
              {candidate?.first_name?.[0] || ''}{candidate?.last_name?.[0] || ''}
            </div>
            <div>
              <div className="recipient-name">
                {candidate?.first_name || 'Candidate'} {candidate?.last_name || ''}
              </div>
              <div className="recipient-email">{candidate?.email || 'No email available'}</div>
            </div>
          </div>

          {/* Job Preview */}
          {job && (
            <div className="job-preview">
                <div className="job-preview-header">
                <span>📋 Position Details</span>
                </div>
                <div className="job-preview-body">
                <strong>{job.title || 'Position'}</strong>
                <div>{job.facility_name || job.facility || 'N/A'}</div>
                <div>📍 {job.city || 'N/A'}{job.city && job.state ? ', ' : ''}{job.state || ''}</div>
                {job.pay_package && <div>💰 {job.pay_package}</div>}
                {job.start_date && <div>📅 Starts: {job.start_date}</div>}
                </div>
            </div>
            )}

          {/* Email Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="subject">Subject Line</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Personal Message (Optional)</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="form-control"
                rows="5"
                placeholder="Add a personal note to the candidate... (optional)"
              />
              <small className="form-help">
                This message will be highlighted in the email to the candidate
              </small>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="includeJobDetails"
                  checked={formData.includeJobDetails}
                  onChange={handleChange}
                />
                Include full job details in email
              </label>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={sending}
              >
                {sending ? (
                  <>
                    <span className="spinner"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <span>✉️</span>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;