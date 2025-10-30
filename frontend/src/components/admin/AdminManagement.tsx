import { useState, useEffect } from 'react';
import { MdPersonAdd, MdDelete } from 'react-icons/md';
import api from '../../utils/api';
import type { Admin } from '../../types';

export default function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await api.get<Admin[]>('/admin/users');
      setAdmins(response.data);
    } catch (err) {
      setError('Failed to fetch admins');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/admin/users', {
        username: newUsername,
        password: newPassword,
      });

      setSuccess('Admin created successfully');
      setNewUsername('');
      setNewPassword('');
      fetchAdmins();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Username already exists');
      } else {
        setError('Failed to create admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this admin?')) {
      return;
    }

    try {
      await api.delete(`/admin/users/${id}`);
      setSuccess('Admin deleted successfully');
      fetchAdmins();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Cannot delete super admin');
      } else if (err.response?.status === 404) {
        setError('Admin not found');
      } else {
        setError('Failed to delete admin');
      }
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Admin Management</h2>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.createSection}>
        <h3 style={styles.sectionTitle}>Create New Admin</h3>
        <form onSubmit={handleCreate} style={styles.form}>
          <div style={styles.formRow}>
            <input
              type="text"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              style={styles.input}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={styles.input}
              disabled={loading}
              minLength={6}
            />
            <button type="submit" disabled={loading} style={styles.createButton} className="icon-button touch-target">
              <MdPersonAdd />
              <span className="icon-button-text">{loading ? 'Creating...' : 'Create Admin'}</span>
            </button>
          </div>
        </form>
      </div>

      <div style={styles.listSection}>
        <h3 style={styles.sectionTitle}>Existing Admins</h3>
        {admins.length === 0 ? (
          <p style={styles.empty}>No admins found</p>
        ) : (
          <div style={styles.adminList}>
            {admins.map((admin) => (
              <div key={admin.id} style={styles.adminItem}>
                <div style={styles.adminInfo}>
                  <span style={styles.adminUsername}>{admin.username}</span>
                  {admin.is_super_admin && (
                    <span style={styles.superAdminBadge}>Super Admin</span>
                  )}
                  <span style={styles.adminDate}>
                    Created: {new Date(admin.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={styles.adminActions}>
                  {admin.is_super_admin ? (
                    <span style={styles.cannotDelete}>Cannot Delete</span>
                  ) : (
                    <button
                      onClick={() => handleDelete(admin.id)}
                      style={styles.deleteButton}
                      className="icon-button touch-target"
                    >
                      <MdDelete />
                      <span className="icon-button-text">Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    color: '#1f2937',
  },
  error: {
    padding: '0.75rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  success: {
    padding: '0.75rem',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  createSection: {
    backgroundColor: 'white',
    padding: 'clamp(1rem, 2vw, 1.5rem)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '1.5rem',
  },
  listSection: {
    backgroundColor: 'white',
    padding: 'clamp(1rem, 2vw, 1.5rem)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#374151',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  formRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  input: {
    flex: '1',
    minWidth: '200px',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  createButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  empty: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '2rem',
  },
  adminList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  adminItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    backgroundColor: '#f9fafb',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  adminInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  adminUsername: {
    fontWeight: '600',
    color: '#1f2937',
    fontSize: '0.938rem',
  },
  superAdminBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  adminDate: {
    color: '#6b7280',
    fontSize: '0.813rem',
  },
  adminActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.813rem',
    fontWeight: '500',
  },
  cannotDelete: {
    padding: '0.5rem 1rem',
    color: '#9ca3af',
    fontSize: '0.813rem',
    fontStyle: 'italic' as const,
  },
};
