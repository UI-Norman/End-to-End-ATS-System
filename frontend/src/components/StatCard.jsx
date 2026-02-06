import React from 'react';
import './StatCard.css';

const StatCard = ({ icon, title, value, subtitle, color, urgent, onClick }) => (
  <div 
    className={`stat-card stat-${color} ${urgent ? 'stat-urgent' : ''} ${onClick ? 'clickable' : ''}`}
    onClick={onClick}
  >
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <h3 className="stat-value">{value}</h3>
      <p className="stat-title">{title}</p>
      <p className="stat-subtitle">{subtitle}</p>
    </div>
  </div>
);

export default StatCard;
