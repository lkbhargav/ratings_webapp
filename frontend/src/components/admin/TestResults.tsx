import { useState, useEffect } from 'react';
import api from '../../utils/api';
import type { Test, TestResultsResponse } from '../../types';
import StarRating from '../StarRating';

export default function TestResults() {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [results, setResults] = useState<TestResultsResponse | null>(null);
  const [viewMode, setViewMode] = useState<'aggregated' | 'individual'>('aggregated');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      fetchResults(selectedTest);
    }
  }, [selectedTest]);

  const fetchTests = async () => {
    try {
      const response = await api.get<Test[]>('/admin/tests');
      setTests(response.data);
    } catch (err) {
      setError('Failed to fetch tests');
    }
  };

  const fetchResults = async (testId: number) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<TestResultsResponse>(
        `/admin/tests/${testId}/results`
      );
      setResults(response.data);
    } catch (err) {
      setError('Failed to fetch results');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Test Results</h2>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.controls}>
        <select
          value={selectedTest || ''}
          onChange={(e) => setSelectedTest(Number(e.target.value))}
          style={styles.select}
        >
          <option value="">Select a test to view results</option>
          {tests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.name} ({test.status})
            </option>
          ))}
        </select>

        {results && (
          <div style={styles.tabs}>
            <button
              onClick={() => setViewMode('aggregated')}
              style={{
                ...styles.tab,
                ...(viewMode === 'aggregated' ? styles.activeTab : {}),
              }}
            >
              Aggregated
            </button>
            <button
              onClick={() => setViewMode('individual')}
              style={{
                ...styles.tab,
                ...(viewMode === 'individual' ? styles.activeTab : {}),
              }}
            >
              Individual
            </button>
          </div>
        )}
      </div>

      {loading && <p style={styles.loading}>Loading results...</p>}

      {results && !loading && (
        <>
          {viewMode === 'aggregated' && (
            <div style={styles.section}>
              <h3 style={styles.subheading}>Aggregated Statistics</h3>
              {results.aggregated.length === 0 ? (
                <p style={styles.empty}>No ratings yet for this test.</p>
              ) : (
                <div style={styles.table}>
                  <div style={styles.tableHeader}>
                    <div style={styles.tableCell}>Media File</div>
                    <div style={styles.tableCell}>Type</div>
                    <div style={styles.tableCell}>Average Rating</div>
                    <div style={styles.tableCell}>Total Ratings</div>
                  </div>
                  {results.aggregated.map((stat) => (
                    <div key={stat.media_file.id} style={styles.tableRow}>
                      <div style={styles.tableCell}>
                        {stat.media_file.filename}
                      </div>
                      <div style={styles.tableCell}>
                        <span style={styles.badge}>
                          {stat.media_file.media_type}
                        </span>
                      </div>
                      <div style={styles.tableCell}>
                        <StarRating rating={stat.average_stars} size="small" showLabel />
                      </div>
                      <div style={styles.tableCell}>{stat.total_ratings}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'individual' && (
            <div style={styles.section}>
              <h3 style={styles.subheading}>Individual Responses</h3>
              {results.individual.length === 0 ? (
                <p style={styles.empty}>No individual ratings yet.</p>
              ) : (
                <div style={styles.list}>
                  {results.individual.map((item) => (
                    <div key={item.rating.id} style={styles.ratingCard}>
                      <div style={styles.ratingHeader}>
                        <strong style={styles.userEmail}>
                          {item.user_email}
                        </strong>
                        <span style={styles.ratingDate}>
                          {new Date(item.rating.rated_at).toLocaleString()}
                        </span>
                      </div>
                      <div style={styles.mediaInfo}>
                        <span style={styles.mediaFilename}>{item.media_file.filename}</span>
                        <span style={styles.mediaBadge}>{item.media_file.media_type}</span>
                      </div>
                      <div style={styles.ratingBody}>
                        <div style={styles.ratingStars}>
                          <StarRating rating={Number(item.rating.stars)} size="medium" showLabel />
                        </div>
                        {item.rating.comment && (
                          <p style={styles.ratingComment}>
                            "{item.rating.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
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
  error: {
    padding: '0.75rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
  },
  tab: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  loading: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '2rem',
  },
  section: {
    marginTop: '1.5rem',
  },
  subheading: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#374151',
  },
  empty: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '2rem',
  },
  table: {
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr 1fr',
    backgroundColor: '#f9fafb',
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr 1fr',
    borderTop: '1px solid #e5e7eb',
  },
  tableCell: {
    padding: '0.75rem',
    fontSize: '0.875rem',
    color: '#374151',
  },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  ratingCard: {
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
  },
  ratingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  userEmail: {
    fontSize: '0.875rem',
    color: '#1f2937',
  },
  ratingDate: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  mediaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #f3f4f6',
  },
  mediaFilename: {
    fontSize: '0.875rem',
    color: '#4b5563',
    fontWeight: '500',
    flex: 1,
  },
  mediaBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
  },
  ratingBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  ratingStars: {
    display: 'flex',
    alignItems: 'center',
  },
  ratingComment: {
    fontSize: '0.875rem',
    color: '#374151',
    fontStyle: 'italic' as const,
  },
};
