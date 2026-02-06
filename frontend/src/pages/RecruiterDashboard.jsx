import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, Calendar, Bell, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getDashboardStats, getAlerts, getEndingAssignments } from '../services/api';
import './Dashboard.css';

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [endingAssignments, setEndingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, alertsRes, endingRes] = await Promise.all([
        getDashboardStats(),
        getAlerts({ is_read: false }),
        getEndingAssignments(30)
      ]);
      
      setStats(statsRes.data);
      setAlerts(alertsRes.data.alerts.slice(0, 5));
      
      // The endpoint returns 'assignments'
      const assignments = endingRes.data.assignments || [];
      setEndingAssignments(assignments);
      
      console.log('Dashboard loaded:', {
        stats: statsRes.data,
        alerts: alertsRes.data.alerts.length,
        endingAssignments: assignments.length,
        endingData: endingRes.data
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      console.error('Error details:', error.response?.data);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Recruiter Dashboard</h1>
        <p className="subtitle">Welcome to your Travel Healthcare ATS</p>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon={<Users />}
          title="Total Candidates"
          value={stats?.candidates.total || 0}
          subtitle={`${stats?.candidates.active || 0} active`}
          color="blue"
        />
        <StatCard
          icon={<Briefcase />}
          title="Open Jobs"
          value={stats?.jobs.open || 0}
          subtitle={`${stats?.jobs.total || 0} total jobs`}
          color="green"
        />
        <StatCard
          icon={<Calendar />}
          title="Active Assignments"
          value={stats?.assignments.active || 0}
          subtitle={`${stats?.assignments.completed || 0} completed`}
          color="purple"
        />
        <StatCard
          icon={<AlertCircle />}
          title="Ending Soon"
          value={stats?.assignments.ending_soon || 0}
          subtitle={`Within ${stats?.assignments.ending_soon_days || 30} days`}
          color="orange"
          urgent={stats?.assignments.ending_soon > 0}
        />
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Alerts Section */}
        <div className="card alerts-card">
          <div className="card-header">
            <h2><Bell size={20} /> Recent Alerts</h2>
            <span className="badge">{stats?.alerts.unread || 0} new</span>
          </div>
          <div className="alerts-list">
            {alerts.length === 0 ? (
              <p className="empty-state">No new alerts</p>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`alert-item alert-${alert.alert_type}`}>
                  <div className="alert-icon">
                    {alert.alert_type === 'contract_ending' && <Clock size={16} />}
                    {alert.alert_type === 'new_match' && <CheckCircle size={16} />}
                    {alert.alert_type === 'document_expiring' && <AlertCircle size={16} />}
                  </div>
                  <div className="alert-content">
                    <p className="alert-message">{alert.message}</p>
                    <span className="alert-time">{new Date(alert.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ending Assignments */}
        <div className="card ending-card">
          <div className="card-header">
            <h2><TrendingUp size={20} /> Assignments Ending Soon</h2>
          </div>
          <div className="ending-list">
            {endingAssignments.length === 0 ? (
              <p className="empty-state">No assignments ending soon</p>
            ) : (
              endingAssignments.slice(0, 5).map(assignment => (
                <div key={assignment.assignment_id} className="ending-item">
                  <div className="ending-info">
                    <h4>
                      {assignment.candidate?.full_name || 'Unknown Candidate'}
                    </h4>
                    <p className="ending-location">
                      {assignment.job ? 
                        `${assignment.job.facility}, ${assignment.job.state}` : 
                        'Location not available'
                      }
                    </p>
                  </div>
                  <div className="ending-days">
                    <span className={`days-badge ${assignment.days_remaining <= 14 ? 'urgent' : ''}`}>
                      {assignment.days_remaining} days
                    </span>
                    <span className="matches-count">
                      End: {assignment.end_date}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn action-primary" onClick={() => navigate('/candidates')}>
            <Users size={20} />
            View Candidates
          </button>
          <button className="action-btn action-secondary" onClick={() => navigate('/jobs')}>
            <Briefcase size={20} />
            View Jobs
          </button>
          <button className="action-btn action-tertiary" onClick={() => navigate('/assignments')}>
            <TrendingUp size={20} />
            View Assignments
          </button>
          <button className="action-btn action-accent" onClick={() => navigate('/import')}>
            <Calendar size={20} />
            Import Data
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle, color, urgent }) => (
  <div className={`stat-card stat-${color} ${urgent ? 'stat-urgent' : ''}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <h3 className="stat-value">{value}</h3>
      <p className="stat-title">{title}</p>
      <p className="stat-subtitle">{subtitle}</p>
    </div>
  </div>
);

export default RecruiterDashboard;