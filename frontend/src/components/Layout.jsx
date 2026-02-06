import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Calendar, 
  Bell, 
  FileText, 
  DollarSign, 
  Upload,
  LogOut,
  User as UserIcon,
  Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Candidates', path: '/candidates', icon: <Users size={20} /> },
    { name: 'Jobs', path: '/jobs', icon: <Briefcase size={20} /> },
    { name: 'Matching', path: '/matching', icon: <Target size={20} /> },
    { name: 'Assignments', path: '/assignments', icon: <Calendar size={20} /> },
    { name: 'Alerts', path: '/alerts', icon: <Bell size={20} /> },
    { name: 'Documents', path: '/documents', icon: <FileText size={20} /> },
    { name: 'Expenses', path: '/expenses', icon: <DollarSign size={20} /> },
    { name: 'Import Data', path: '/import', icon: <Upload size={20} /> },
  ];

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    } else if (user?.name) {
      const names = user.name.split(' ');
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : user.name[0].toUpperCase();
    }
    return 'U';
  };

  // Get user display name
  const getUserName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user?.name) {
      return user.name;
    } else if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  // Get user email
  const getUserEmail = () => {
    return user?.email || 'No email';
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Briefcase size={24} />
          </div>
          <h2>Travel ATS</h2>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {getUserInitials()}
            </div>
            <div className="user-details">
              <div className="user-name">
                {getUserName()}
              </div>
              <div className="user-email">{getUserEmail()}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;