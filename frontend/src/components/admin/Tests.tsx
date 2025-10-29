import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../Modal';
import type { Category, Test, TestUser, TestUserResponse } from '../../types';

export default function Tests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [testName, setTestName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTest, setModalTest] = useState<Test | null>(null);
  const [modalUsers, setModalUsers] = useState<TestUser[]>([]);

  useEffect(() => {
    fetchTests();
    fetchCategories();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await api.get<Test[]>('/admin/tests');
      setTests(response.data);
    } catch (err) {
      setError('Failed to fetch tests');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get<Category[]>('/admin/categories');
      setCategories(response.data);
    } catch (err) {
      setError('Failed to fetch categories');
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim() || !selectedCategory) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/admin/tests', {
        name: testName,
        category_id: selectedCategory,
      });
      setTestName('');
      setSelectedCategory(null);
      fetchTests();
    } catch (err) {
      setError('Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSelect = (testId: number) => {
    setSelectedTest(testId);
    setGeneratedLink('');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest || !userEmail.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post<TestUserResponse>(
        `/admin/tests/${selectedTest}/users`,
        { email: userEmail }
      );
      setGeneratedLink(response.data.link);
      setUserEmail('');
    } catch (err) {
      setError('Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    });
  };

  const getFrontendUrl = () => {
    return window.location.origin;
  };

  const generateUserLink = (token: string) => {
    return `${getFrontendUrl()}/test/${token}`;
  };

  const handleCloseTest = async (testId: number) => {
    if (!confirm('Are you sure you want to close this test?')) return;

    try {
      await api.patch(`/admin/tests/${testId}/close`);
      fetchTests();
    } catch (err) {
      setError('Failed to close test');
    }
  };

  const handleViewDetails = async (test: Test) => {
    setModalTest(test);
    setModalOpen(true);
    try {
      const response = await api.get<TestUser[]>(`/admin/tests/${test.id}/users`);
      setModalUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch test users');
    }
  };

  const handleDeleteUser = async (testId: number, userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/admin/tests/${testId}/users/${userId}`);
      // Refresh the modal user list
      if (modalTest) {
        const response = await api.get<TestUser[]>(`/admin/tests/${testId}/users`);
        setModalUsers(response.data);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        alert('Cannot delete user from closed test');
      } else {
        alert('Failed to delete user');
      }
    }
  };

  const handleDeleteTest = async (testId: number) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) return;

    try {
      await api.delete(`/admin/tests/${testId}`);
      fetchTests();
      setError('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You can only delete tests you created. Super admins can delete any test.');
      } else {
        setError('Failed to delete test');
      }
    }
  };


  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Manage Tests</h2>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.section}>
        <h3 style={styles.subheading}>Create New Test</h3>
        <form onSubmit={handleCreateTest} style={styles.form}>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Test name"
            style={styles.input}
            required
            disabled={loading}
          />
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(Number(e.target.value))}
            style={styles.select}
            required
            disabled={loading}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || !testName.trim() || !selectedCategory}
            style={{
              ...styles.button,
              ...(loading || !testName.trim() || !selectedCategory ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Creating...' : 'Create Test'}
          </button>
        </form>
      </div>

      <div style={styles.section}>
        <h3 style={styles.subheading}>Add User to Test</h3>
        <form onSubmit={handleAddUser} style={styles.form}>
          <select
            value={selectedTest || ''}
            onChange={(e) => handleTestSelect(Number(e.target.value))}
            style={styles.select}
            required
            disabled={loading}
          >
            <option value="">Select Test</option>
            {tests.filter(t => t.status === 'open').map((test) => (
              <option key={test.id} value={test.id}>
                {test.name}
              </option>
            ))}
          </select>
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="User email"
            style={styles.input}
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !selectedTest || !userEmail.trim()}
            style={{
              ...styles.button,
              ...(loading || !selectedTest || !userEmail.trim() ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Generating...' : 'Generate Link'}
          </button>
        </form>
        {generatedLink && (
          <div style={styles.linkBox}>
            <p style={styles.linkLabel}>Generated Link:</p>
            <input
              type="text"
              value={generatedLink}
              readOnly
              style={styles.linkInput}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={() => copyToClipboard(generatedLink)}
              style={styles.copyButton}
            >
              Copy
            </button>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.subheading}>All Tests</h3>
        <div style={styles.list}>
          {tests.length === 0 ? (
            <p style={styles.empty}>No tests yet. Create one above!</p>
          ) : (
            tests.map((test) => (
              <div key={test.id} style={styles.item}>
                <div>
                  <h4 style={styles.itemTitle}>{test.name}</h4>
                  <p style={styles.itemDate}>
                    Created: {new Date(test.created_at).toLocaleDateString()}
                  </p>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(test.status === 'open'
                        ? styles.statusOpen
                        : styles.statusClosed),
                    }}
                  >
                    {test.status}
                  </span>
                </div>
                <div style={styles.actions}>
                  <button
                    onClick={() => handleViewDetails(test)}
                    style={styles.viewButton}
                  >
                    View Details
                  </button>
                  {test.status === 'open' && (
                    <button
                      onClick={() => handleCloseTest(test.id)}
                      style={styles.closeButton}
                    >
                      Close Test
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    style={styles.deleteButton}
                  >
                    Delete Test
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTest ? `Test Details: ${modalTest.name}` : 'Test Details'}
      >
        {modalTest && (
          <div style={styles.modalContent}>
            <div style={styles.modalInfo}>
              <div style={styles.modalInfoRow}>
                <span style={styles.modalLabel}>Status:</span>
                <span
                  style={{
                    ...styles.statusBadge,
                    ...(modalTest.status === 'open' ? styles.statusOpen : styles.statusClosed),
                  }}
                >
                  {modalTest.status}
                </span>
              </div>
              <div style={styles.modalInfoRow}>
                <span style={styles.modalLabel}>Created:</span>
                <span>{new Date(modalTest.created_at).toLocaleString()}</span>
              </div>
              <div style={styles.modalInfoRow}>
                <span style={styles.modalLabel}>Total Users:</span>
                <span>{modalUsers.length}</span>
              </div>
            </div>

            <div style={styles.modalSection}>
              <h3 style={styles.modalSectionTitle}>Test Users</h3>
              {modalUsers.length === 0 ? (
                <p style={styles.empty}>No users added yet</p>
              ) : (
                <div style={styles.modalUsersList}>
                  {modalUsers.map((user) => (
                    <div key={user.id} style={styles.modalUserItem}>
                      <div style={styles.modalUserInfo}>
                        <span style={styles.userEmail}>{user.email}</span>
                        <span
                          style={
                            user.completed_at
                              ? styles.statusCompleted
                              : user.accessed_at
                              ? styles.statusAccessed
                              : styles.statusNotAccessed
                          }
                        >
                          {user.completed_at
                            ? `Completed ${new Date(user.completed_at).toLocaleString()}`
                            : user.accessed_at
                            ? `Accessed ${new Date(user.accessed_at).toLocaleString()}`
                            : 'Not Accessed'}
                        </span>
                      </div>
                      <div style={styles.modalUserActions}>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generateUserLink(user.one_time_token))}
                          style={styles.copyButtonSmall}
                        >
                          Copy Link
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(modalTest.id, user.id)}
                          style={{
                            ...styles.deleteButtonSmall,
                            ...(modalTest.status === 'closed' ? styles.deleteButtonDisabled : {}),
                          }}
                          disabled={modalTest.status === 'closed'}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  heading: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    color: '#1f2937',
  },
  section: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #e5e7eb',
  },
  subheading: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#374151',
  },
  error: {
    padding: '0.75rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  button: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
    color: '#9ca3af',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '0.875rem',
    color: '#374151',
  },
  linkBox: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
    flexDirection: 'column' as const,
  },
  linkLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  linkInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    backgroundColor: 'white',
  },
  copyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  userEmail: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1f2937',
  },
  statusCompleted: {
    fontSize: '0.75rem',
    color: '#059669',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
  },
  statusAccessed: {
    fontSize: '0.75rem',
    color: '#f59e0b',
    fontWeight: '500',
  },
  statusNotAccessed: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  copyButtonSmall: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    marginLeft: '0.5rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  empty: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '2rem',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
  },
  itemTitle: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: '0.25rem',
  },
  itemDate: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.5rem',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
  },
  statusOpen: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusClosed: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  closeButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  modalInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
  },
  modalInfoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  modalLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    minWidth: '80px',
  },
  modalSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  modalSectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  modalUsersList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  modalUserItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  modalUserInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    flex: 1,
  },
  modalUserActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  deleteButtonSmall: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  deleteButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
};
