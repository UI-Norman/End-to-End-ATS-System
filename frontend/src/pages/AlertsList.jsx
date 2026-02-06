import React, { useState, useEffect } from 'react';
import { Bell, Clock, CheckCircle, AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { getAlerts, markAlertAsRead, markAllAlertsUnread } from '../services/api';
import './Alerts.css';

const AlertsList = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 
  const [stats, setStats] = useState({ total: 0, unread: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [allAlertsData, setAllAlertsData] = useState([]); 

  // Load alerts when filter changes or on mount
  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      
      // Get ALL alerts from database
      console.log(`[AlertsList] Loading ALL alerts...`);
      const allResponse = await getAlerts({ limit: 999999 });
      const allAlerts = allResponse.data.alerts || [];
      
      console.log(`[AlertsList] Received ${allAlerts.length} total alerts from backend`);
      
      // Store ALL alerts data for later use
      setAllAlertsData(allAlerts);
      
      // Calculate accurate stats from ALL alerts
      const totalCount = allAlerts.length;
      const unreadCount = allAlerts.filter(a => a.is_read === false).length;
      
      console.log('[AlertsList] Stats:', { total: totalCount, unread: unreadCount });
      
      setStats({
        total: totalCount,
        unread: unreadCount,
      });
      
      // Filter alerts based on current tab
      let displayAlerts = allAlerts;
      
      if (filter === 'unread') {
        // Only show UNREAD alerts
        displayAlerts = allAlerts
          .filter(a => a.is_read === false)
          .slice(0, 50); 
        console.log(`[AlertsList] Filtered to ${displayAlerts.length} UNREAD alerts for display (max 50)`);
      } else {
        console.log(`[AlertsList] Showing all ${displayAlerts.length} alerts`);
      }
      
      setAlerts(displayAlerts);
      
      console.log('[AlertsList] Final display:', {
        filter: filter,
        displayCount: displayAlerts.length,
        unreadInDisplay: displayAlerts.filter(a => !a.is_read).length,
        readInDisplay: displayAlerts.filter(a => a.is_read).length
      });
      
    } catch (error) {
      console.error('[AlertsList] Error loading alerts:', error);
      if (error.response) {
        console.error('[AlertsList] Server response:', error.response.data);
        console.error('[AlertsList] Status:', error.response.status);
      }
      setAlerts([]);
      setAllAlertsData([]);
      setStats({ total: 0, unread: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setUndoing(false);
    }
  };

  const handleMarkRead = async (alertId) => {
    try {
      console.log(`[AlertsList] Marking alert ${alertId} as read...`);
      
      // Mark as read in backend
      await markAlertAsRead(alertId);
      
      // Give database time to update
      console.log('[AlertsList] Waiting for database to update...');
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Get fresh data from database
      console.log('[AlertsList] Reloading alerts...');
      await loadAlerts();
      
      console.log('[AlertsList] ✓ Alert marked as read successfully');
      
    } catch (error) {
      console.error('[AlertsList] ✗ Error marking alert as read:', error);
      alert('Failed to mark alert as read. Please try again.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      
      // Get ALL unread alerts from the full dataset
      const allUnreadAlerts = allAlertsData.filter((a) => a.is_read === false);
      
      // If no unread alerts, show message
      if (allUnreadAlerts.length === 0) {
        alert('No unread alerts to mark as read!');
        setMarkingAll(false);
        return;
      }
      
      console.log(`[AlertsList] Marking ALL ${allUnreadAlerts.length} unread alerts as read...`);
      
      // Confirm if there are many alerts
      if (allUnreadAlerts.length > 50) {
        const confirmed = window.confirm(
          `This will mark ALL ${allUnreadAlerts.length} unread alerts as read. Continue?`
        );
        if (!confirmed) {
          setMarkingAll(false);
          return;
        }
      }
      
      // Mark all as read in backend
      await Promise.all(
        allUnreadAlerts.map((alert) => markAlertAsRead(alert.alert_id))
      );
      
      // Give database time to update all records
      console.log('[AlertsList] Waiting for database to update all records...');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Get fresh data from database
      console.log('[AlertsList] Reloading alerts...');
      await loadAlerts();
      
      // Show message
      alert(`✓ Successfully marked ALL ${allUnreadAlerts.length} alert(s) as read!`);
      console.log('[AlertsList] ✓ All alerts marked as read successfully');
      
    } catch (error) {
      console.error('[AlertsList] ✗ Error marking all as read:', error);
      alert('Failed to mark all alerts as read. Please try again.');
      await loadAlerts(); 
    } finally {
      setMarkingAll(false);
    }
  };

  // Mark all alerts as unread
  const handleUndoMarkAsRead = async () => {
    try {
      setUndoing(true);
      
      console.log('[AlertsList] Undoing - Marking ALL alerts as unread...');
      
      // Confirm action
      const confirmed = window.confirm(
        'This will mark ALL alerts as UNREAD. Are you sure?'
      );
      
      if (!confirmed) {
        setUndoing(false);
        return;
      }
      
      // Call backend to mark all as unread
      const response = await markAllAlertsUnread();
      
      console.log('[AlertsList] Backend response:', response.data);
      
      // Give database time to update
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Get fresh data
      console.log('[AlertsList] Reloading alerts...');
      await loadAlerts();
      
      // SUCCESS: Show message
      const count = response.data.count || 'All';
      alert(`✓ Successfully restored ${count} alerts to UNREAD state!`);
      console.log('[AlertsList] ✓ All alerts marked as unread successfully');
      
    } catch (error) {
      console.error('[AlertsList] ✗ Error marking all as unread:', error);
      alert('Failed to restore alerts. Please try again.');
      await loadAlerts();
    } finally {
      setUndoing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'contract_ending':
        return <Clock size={20} />;
      case 'new_match':
        return <CheckCircle size={20} />;
      case 'document_expiring':
        return <AlertCircle size={20} />;
      case 'candidate_interested':
        return <Bell size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'critical':
        return 'priority-critical';
      default:
        return 'priority-normal';
    }
  };

  return (
    <div className="alerts-page">
      <div className="page-header">
        <div>
          <h1>
            <Bell size={28} /> Alerts
          </h1>
          <p className="page-subtitle">Stay updated with important notifications</p>
        </div>
        <div className="header-actions">
          {/* Restore all to unread */}
          <button
            className="btn-undo"
            onClick={handleUndoMarkAsRead}
            disabled={undoing || loading || stats.total === 0}
            title="Restore all alerts to UNREAD state"
            style={{
              padding: '10px 18px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: stats.total === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              opacity: stats.total === 0 ? 0.5 : 1
            }}
          >
            <RotateCcw size={18} className={undoing ? 'spinning' : ''} />
            {undoing ? 'Restoring...' : 'Undo (Restore All)'}
          </button>

          {stats.unread > 0 && (
            <button
              className="btn-secondary"
              onClick={handleMarkAllRead}
              disabled={markingAll || loading}
              title="Mark ALL unread alerts as read"
            >
              <CheckCircle size={18} />
              {markingAll ? 'Marking...' : `Mark All Read (${stats.unread})`}
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh alerts list"
          >
            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="alerts-stats">
        <div className="stat-item">
          <span className="stat-label">Total Alerts:</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Unread:</span>
          <span className="stat-value stat-unread">{stats.unread}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          disabled={loading}
        >
          All Alerts
          {stats.total > 0 && <span className="tab-badge">{stats.total}</span>}
        </button>
        <button
          className={`tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
          disabled={loading}
        >
          Unread
          {stats.unread > 0 && (
            <span className="tab-badge unread-badge">{stats.unread}</span>
          )}
        </button>
      </div>

      {/* Alerts List */}
      <div className="alerts-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>
              No {filter === 'unread' ? 'unread ' : ''}alerts
            </h3>
            <p>
              {filter === 'unread'
                ? "You're all caught up! No unread alerts at the moment."
                : "No alerts yet. They'll appear here when system events occur."}
            </p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div
                key={alert.alert_id}
                className={`alert-card ${
                  !alert.is_read ? 'unread' : ''
                } alert-type-${alert.alert_type} ${getPriorityClass(
                  alert.priority
                )}`}
              >
                <div className="alert-icon-wrapper">
                  {getAlertIcon(alert.alert_type)}
                </div>
                <div className="alert-content">
                  {alert.title && (
                    <h4 className="alert-title">{alert.title}</h4>
                  )}
                  <p className="alert-message">{alert.message}</p>
                  <div className="alert-meta">
                    <span className="alert-time">
                      {new Date(alert.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {alert.priority && alert.priority !== 'normal' && (
                      <span
                        className={`alert-priority priority-${alert.priority}`}
                      >
                        {alert.priority.toUpperCase()}
                      </span>
                    )}
                    {alert.candidate_id && (
                      <span className="alert-tag">
                        Candidate: {alert.candidate_id}
                      </span>
                    )}
                    {alert.job_id && (
                      <span className="alert-tag">Job: {alert.job_id}</span>
                    )}
                  </div>
                  {alert.action_required && (
                    <div className="alert-action-required">
                      ⚠️ Action Required
                    </div>
                  )}
                </div>
                <div className="alert-actions">
                  {!alert.is_read && (
                    <button
                      className="btn-mark-read"
                      onClick={() => handleMarkRead(alert.alert_id)}
                      title="Mark as read"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  {alert.is_read && (
                    <div className="read-indicator" title="Already read">
                      <CheckCircle size={18} className="check-icon" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsList;