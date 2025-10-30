import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../utils/auth';
import { MdCategory, MdPermMedia, MdAssignment, MdBarChart, MdPeople, MdHistory, MdLogout } from 'react-icons/md';
import Categories from '../components/admin/Categories';
import MediaUpload from '../components/admin/MediaUpload';
import Tests from '../components/admin/Tests';
import TestResults from '../components/admin/TestResults';
import AdminManagement from '../components/admin/AdminManagement';
import ActivityLog from '../components/admin/ActivityLog';

type Tab = 'categories' | 'media' | 'tests' | 'results' | 'admins' | 'activity-log';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const navigate = useNavigate();
  const isSuperAdmin = localStorage.getItem('is_super_admin') === 'true';

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem('is_super_admin');
    navigate('/admin/login');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <button onClick={handleLogout} style={styles.logoutButton} className="icon-button">
          <MdLogout />
          <span className="icon-button-text">Logout</span>
        </button>
      </header>

      <div style={styles.tabs} className="tabs-container">
        <button
          onClick={() => setActiveTab('categories')}
          style={{
            ...styles.tab,
            ...(activeTab === 'categories' ? styles.activeTab : {}),
          }}
          className="icon-button"
        >
          <MdCategory />
          <span className="icon-button-text">Categories</span>
        </button>
        <button
          onClick={() => setActiveTab('media')}
          style={{
            ...styles.tab,
            ...(activeTab === 'media' ? styles.activeTab : {}),
          }}
          className="icon-button"
        >
          <MdPermMedia />
          <span className="icon-button-text">Media Files</span>
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          style={{
            ...styles.tab,
            ...(activeTab === 'tests' ? styles.activeTab : {}),
          }}
          className="icon-button"
        >
          <MdAssignment />
          <span className="icon-button-text">Tests</span>
        </button>
        <button
          onClick={() => setActiveTab('results')}
          style={{
            ...styles.tab,
            ...(activeTab === 'results' ? styles.activeTab : {}),
          }}
          className="icon-button"
        >
          <MdBarChart />
          <span className="icon-button-text">Results</span>
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('admins')}
            style={{
              ...styles.tab,
              ...(activeTab === 'admins' ? styles.activeTab : {}),
            }}
            className="icon-button"
          >
            <MdPeople />
            <span className="icon-button-text">Admin Management</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('activity-log')}
          style={{
            ...styles.tab,
            ...(activeTab === 'activity-log' ? styles.activeTab : {}),
          }}
          className="icon-button"
        >
          <MdHistory />
          <span className="icon-button-text">Activity Log</span>
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'categories' && <Categories />}
        {activeTab === 'media' && <MediaUpload />}
        {activeTab === 'tests' && <Tests />}
        {activeTab === 'results' && <TestResults />}
        {activeTab === 'admins' && isSuperAdmin && <AdminManagement />}
        {activeTab === 'activity-log' && <ActivityLog />}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: 'white',
    padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
  },
  title: {
    fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  tabs: {
    backgroundColor: 'white',
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    gap: '0.25rem',
    overflowX: 'auto' as const,
  },
  tab: {
    padding: 'clamp(0.75rem, 2vw, 1rem)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    whiteSpace: 'nowrap' as const,
  },
  activeTab: {
    color: '#3b82f6',
    borderBottom: '2px solid #3b82f6',
  },
  content: {
    padding: 'clamp(1rem, 2vw, 2rem)',
  },
};
