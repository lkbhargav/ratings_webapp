import { useState, useEffect } from 'react';
import { MdRefresh, MdNavigateBefore, MdNavigateNext, MdClose, MdVisibility } from 'react-icons/md';
import { formatDateTimeWithTimezone } from '../../utils/dateFormatters';
import type { ActivityLog as ActivityLogType, ActivityLogResponse } from '../../types';
import api from '../../utils/api';

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter states
  const [adminFilter, setAdminFilter] = useState('');
  const [userEmailFilter, setUserEmailFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination states
  const [page, setPage] = useState(0);
  const [limit] = useState(50);

  // Expandable details
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', (page * limit).toString());

      if (adminFilter) params.append('admin', adminFilter);
      if (userEmailFilter) params.append('user_email', userEmailFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (entityTypeFilter) params.append('entity_type', entityTypeFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const response = await api.get<ActivityLogResponse>(`/admin/activity-logs?${params}`);
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, adminFilter, userEmailFilter, actionFilter, entityTypeFilter, fromDate, toDate]);

  const resetFilters = () => {
    setAdminFilter('');
    setUserEmailFilter('');
    setActionFilter('');
    setEntityTypeFilter('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith('create') || action.startsWith('add')) return '#10b981';
    if (action.startsWith('delete')) return '#ef4444';
    if (action.startsWith('update') || action.startsWith('change')) return '#f59e0b';
    if (action === 'login') return '#3b82f6';
    if (action.includes('complete')) return '#8b5cf6';
    if (action.includes('access')) return '#6b7280';
    if (action.includes('submit')) return '#14b8a6';
    if (action.includes('close')) return '#f97316';
    return '#6b7280';
  };

  const formatTimestamp = (timestamp: string) => {
    return formatDateTimeWithTimezone(timestamp);
  };

  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Activity Log</h2>
        <span style={styles.totalCount}>{total} total entries</span>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Filters Section */}
      <div style={styles.filtersContainer}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Admin Username</label>
            <input
              type="text"
              value={adminFilter}
              onChange={(e) => {
                setAdminFilter(e.target.value);
                setPage(0);
              }}
              placeholder="Filter by admin..."
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>User Email</label>
            <input
              type="text"
              value={userEmailFilter}
              onChange={(e) => {
                setUserEmailFilter(e.target.value);
                setPage(0);
              }}
              placeholder="Filter by user email..."
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Action</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              style={styles.select}
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="create_admin">Create Admin</option>
              <option value="delete_admin">Delete Admin</option>
              <option value="change_password">Change Password</option>
              <option value="create_category">Create Category</option>
              <option value="delete_category">Delete Category</option>
              <option value="upload_media">Upload Media</option>
              <option value="delete_media">Delete Media</option>
              <option value="update_media_categories">Update Media Categories</option>
              <option value="create_test">Create Test</option>
              <option value="add_test_user">Add Test User</option>
              <option value="delete_test_user">Delete Test User</option>
              <option value="close_test">Close Test</option>
              <option value="access_test">Access Test</option>
              <option value="submit_rating">Submit Rating</option>
              <option value="complete_test">Complete Test</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Entity Type</label>
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(0);
              }}
              style={styles.select}
            >
              <option value="">All Types</option>
              <option value="admin">Admin</option>
              <option value="category">Category</option>
              <option value="media">Media</option>
              <option value="test">Test</option>
              <option value="test_user">Test User</option>
              <option value="rating">Rating</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>From Date</label>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>To Date</label>
            <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              style={styles.input}
            />
          </div>
        </div>

        <button onClick={resetFilters} style={styles.resetButton} className="icon-button touch-target">
          <MdRefresh />
          <span className="icon-button-text">Reset Filters</span>
        </button>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div style={styles.loading}>Loading activity logs...</div>
      ) : logs.length === 0 ? (
        <div style={styles.empty}>No activity logs found</div>
      ) : (
        <>
          <div style={styles.tableContainer} className="table-container">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Actor</th>
                  <th style={styles.th}>Entity</th>
                  <th style={styles.th}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const details = parseDetails(log.details);
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <tr key={log.id} style={styles.tr}>
                      <td style={styles.td}>{formatTimestamp(log.timestamp)}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.actionBadge,
                            backgroundColor: getActionBadgeColor(log.action),
                          }}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {log.admin_username && (
                          <span style={styles.adminBadge}>Admin: {log.admin_username}</span>
                        )}
                        {log.user_email && (
                          <span style={styles.userBadge}>User: {log.user_email}</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {log.entity_type && (
                          <span style={styles.entityInfo}>
                            {log.entity_type}
                            {log.entity_id && ` #${log.entity_id}`}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {details ? (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            style={styles.detailsButton}
                            className="icon-button"
                          >
                            <MdVisibility />
                            <span className="icon-button-text">{isExpanded ? 'Hide Details' : 'Show Details'}</span>
                          </button>
                        ) : (
                          <span style={styles.noDetails}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded Details */}
          {expandedLogId && (
            <div style={styles.detailsPanel}>
              {(() => {
                const log = logs.find((l) => l.id === expandedLogId);
                if (!log) return null;
                const details = parseDetails(log.details);
                return (
                  <div>
                    <div style={styles.detailsHeader}>
                      <h3 style={styles.detailsTitle}>Details for Log #{log.id}</h3>
                      <button
                        onClick={() => setExpandedLogId(null)}
                        style={styles.closeButton}
                        className="icon-button"
                        aria-label="Close details"
                      >
                        <MdClose />
                      </button>
                    </div>
                    <pre style={styles.detailsJson}>
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Pagination */}
          <div style={styles.pagination} className="button-group">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{
                ...styles.paginationButton,
                ...(page === 0 ? styles.paginationButtonDisabled : {}),
              }}
              className="icon-button touch-target"
            >
              <MdNavigateBefore />
              <span className="icon-button-text">Previous</span>
            </button>
            <span style={styles.paginationInfo}>
              Page {page + 1} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              style={{
                ...styles.paginationButton,
                ...(page >= totalPages - 1 ? styles.paginationButtonDisabled : {}),
              }}
              className="icon-button touch-target"
            >
              <span className="icon-button-text">Next</span>
              <MdNavigateNext />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: 'clamp(1rem, 2vw, 2rem)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1f2937',
  },
  totalCount: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  error: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
  },
  filtersContainer: {
    padding: '1.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem',
    marginBottom: '2rem',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    backgroundColor: 'white',
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  loading: {
    padding: '3rem',
    textAlign: 'center' as const,
    color: '#6b7280',
  },
  empty: {
    padding: '3rem',
    textAlign: 'center' as const,
    color: '#9ca3af',
  },
  tableContainer: {
    overflowX: 'auto' as const,
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left' as const,
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  actionBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize' as const,
    display: 'inline-block',
  },
  adminBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  userBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  entityInfo: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  detailsButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    color: '#374151',
  },
  noDetails: {
    color: '#9ca3af',
  },
  detailsPanel: {
    marginTop: '1rem',
    padding: '1.5rem',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  detailsTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: '#6b7280',
  },
  detailsJson: {
    padding: '1rem',
    backgroundColor: '#1f2937',
    color: '#e5e7eb',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    overflowX: 'auto' as const,
    fontFamily: 'monospace',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '2rem',
  },
  paginationButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  paginationButtonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
  },
  paginationInfo: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
};
