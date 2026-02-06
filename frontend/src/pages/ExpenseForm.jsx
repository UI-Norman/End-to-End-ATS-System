import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { createExpense } from '../services/api';  

const ExpenseForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    expense_type: 'travel',
    description: '',
    amount: '',
    candidate_id: '',
    assignment_id: '',
    status: 'pending'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await createExpense(formData);
      
      console.log('Expense created:', response.data);
      
      // Show success message
      alert('Expense created successfully!');
      
      // Navigate back to expenses list
      navigate('/expenses');
      
    } catch (error) {
      console.error('Error creating expense:', error);
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          'Failed to create expense. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="expenses-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <button 
            onClick={() => navigate('/expenses')}
            className="btn-back"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              background: 'none',
              border: 'none',
              color: '#6366f1',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <ArrowLeft size={20} />
            Back to Expenses
          </button>
          <h1><DollarSign size={28} /> Add New Expense</h1>
          <p className="page-subtitle">Submit a new expense for reimbursement</p>
        </div>
      </div>

      {/* Form */}
      <div className="form-container" style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '800px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <form onSubmit={handleSubmit}>
          {/* Expense Type */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Expense Type *
            </label>
            <select
              name="expense_type"
              value={formData.expense_type}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="travel">Travel</option>
              <option value="lodging">Lodging</option>
              <option value="meals">Meals</option>
              <option value="mileage">Mileage</option>
              <option value="licensing">Licensing</option>
              <option value="medical">Medical</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Provide details about this expense..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Amount */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Amount ($) *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Candidate ID */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Candidate ID *
            </label>
            <input
              type="text"
              name="candidate_id"
              value={formData.candidate_id}
              onChange={handleChange}
              required
              placeholder="CND123456789"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <small style={{ color: '#64748b', fontSize: '13px' }}>
              The candidate this expense belongs to
            </small>
          </div>

          {/* Assignment ID (Optional) */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Assignment ID <span style={{ color: '#94a3b8' }}>(Optional)</span>
            </label>
            <input
              type="text"
              name="assignment_id"
              value={formData.assignment_id}
              onChange={handleChange}
              placeholder="ASG123456789"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <small style={{ color: '#64748b', fontSize: '13px' }}>
              Leave blank if not related to a specific assignment
            </small>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                padding: '12px 24px',
                background: loading ? '#94a3b8' : '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? 'Submitting...' : 'Submit Expense'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/expenses')}
              style={{
                padding: '12px 24px',
                background: 'white',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;