import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../utils/auth';
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
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </header>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('categories')}
          style={{
            ...styles.tab,
            ...(activeTab === 'categories' ? styles.activeTab : {}),
          }}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('media')}
          style={{
            ...styles.tab,
            ...(activeTab === 'media' ? styles.activeTab : {}),
          }}
        >
          Media Files
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          style={{
            ...styles.tab,
            ...(activeTab === 'tests' ? styles.activeTab : {}),
          }}
        >
          Tests
        </button>
        <button
          onClick={() => setActiveTab('results')}
          style={{
            ...styles.tab,
            ...(activeTab === 'results' ? styles.activeTab : {}),
          }}
        >
          Results
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('admins')}
            style={{
              ...styles.tab,
              ...(activeTab === 'admins' ? styles.activeTab : {}),
            }}
          >
            Admin Management
          </button>
        )}
        <button
          onClick={() => setActiveTab('activity-log')}
          style={{
            ...styles.tab,
            ...(activeTab === 'activity-log' ? styles.activeTab : {}),
          }}
        >
          Activity Log
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
    padding: '1rem 2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
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
  },
  tab: {
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
  },
  activeTab: {
    color: '#3b82f6',
    borderBottom: '2px solid #3b82f6',
  },
  content: {
    padding: '2rem',
  },
};
