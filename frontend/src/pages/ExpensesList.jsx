import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  // ✅ ADD THIS
import { DollarSign, Search, Plus, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getExpenses } from '../services/api';
import './Expenses.css';

const ExpensesList = () => {
  const navigate = useNavigate();  // ✅ ADD THIS
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: ''
  });

  useEffect(() => {
    loadExpenses();
  }, [filters]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await getExpenses(filters);
      setExpenses(response.data.expenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalAmount = () => {
    return expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  };

  return (
    <div className="expenses-page">
      <div className="page-header">
        <div>
          <h1><DollarSign size={28} /> Expenses</h1>
          <p className="page-subtitle">Track and manage travel expenses</p>
        </div>
        {/* ✅ FIXED: Use navigate instead of window.location.href */}
        <button className="btn-primary" onClick={() => navigate('/expenses/new')}>
          <Plus size={20} /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="expense-summary">
        <div className="summary-card">
          <div className="summary-label">Total Expenses</div>
          <div className="summary-value">{formatCurrency(getTotalAmount())}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Pending</div>
          <div className="summary-value">
            {expenses.filter(e => e.status === 'pending').length}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Approved</div>
          <div className="summary-value">
            {expenses.filter(e => e.status === 'approved').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="search-section">
        <div className="filters">
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <DollarSign size={48} />
            <h3>No expenses found</h3>
            <p>Add expenses to track reimbursements</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Candidate ID</th>
                <th>Assignment ID</th>
                <th>Amount</th>
                <th>Submitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense.id}>
                  <td>
                    <span className="expense-type">{expense.expense_type}</span>
                  </td>
                  <td>{expense.description}</td>
                  <td>{expense.candidate_id}</td>
                  <td>{expense.assignment_id || 'N/A'}</td>
                  <td>
                    <span className="expense-amount">
                      {formatCurrency(expense.amount)}
                    </span>
                  </td>
                  <td>{new Date(expense.submitted_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge status-${expense.status}`}>
                      {expense.status === 'approved' && <CheckCircle size={14} />}
                      {expense.status === 'pending' && <Clock size={14} />}
                      {expense.status === 'rejected' && <XCircle size={14} />}
                      {expense.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ExpensesList;