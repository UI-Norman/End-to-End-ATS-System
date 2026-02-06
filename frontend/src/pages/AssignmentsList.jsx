import React, { useState, useEffect } from 'react';
import { Calendar, Search, Users, Briefcase, Clock } from 'lucide-react';
import { getAssignments } from '../services/api';
import './Assignments.css';

const AssignmentsList = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: ''
  });

  useEffect(() => {
    loadAssignments();
  }, [filters]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await getAssignments(filters);
      setAssignments(response.data.assignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assignments-page">
      <div className="page-header">
        <div>
          <h1><Calendar size={28} /> Assignments</h1>
          <p className="page-subtitle">Track active and completed assignments</p>
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
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No assignments found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Facility</th>
                <th>Location</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => {
                // Use days_remaining from API instead of calculating
                const daysRemaining = assignment.days_remaining;
                
                return (
                  <tr key={assignment.id}>
                    <td>
                      <div className="candidate-info">
                        <div className="candidate-avatar">
                          {assignment.candidate?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="candidate-name">
                            {assignment.candidate?.full_name || 'Unknown'}
                          </div>
                          <div className="candidate-email">
                            {assignment.candidate?.email || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{assignment.job?.facility || 'N/A'}</td>
                    <td>{assignment.job?.state || 'N/A'}</td>
                    <td>{assignment.start_date || 'N/A'}</td>
                    <td>{assignment.end_date || 'N/A'}</td>
                    <td>
                      {daysRemaining !== null && daysRemaining !== undefined ? (
                        <span className={`days-remaining ${daysRemaining <= 14 ? 'urgent' : daysRemaining <= 28 ? 'warning' : ''}`}>
                          {daysRemaining > 0 ? `${daysRemaining} days` : 'Ended'}
                        </span>
                      ) : (
                        <span className="days-remaining">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${assignment.status?.toLowerCase()}`}>
                        {assignment.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AssignmentsList;