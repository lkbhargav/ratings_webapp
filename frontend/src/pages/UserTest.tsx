import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import MediaPlayer from '../components/user/MediaPlayer';
import RatingInput from '../components/user/RatingInput';
import type { TestDetailsResponse, Rating } from '../types';

export default function UserTest() {
  const { token } = useParams<{ token: string }>();
  const [testData, setTestData] = useState<TestDetailsResponse | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [testCompleted, setTestCompleted] = useState(false);

  useEffect(() => {
    if (token) {
      fetchTestData();
      fetchUserRatings();
    }
  }, [token]);

  const fetchTestData = async () => {
    try {
      const response = await axios.get<TestDetailsResponse>(
        `http://localhost:3000/api/test/${token}`
      );
      setTestData(response.data);
    } catch (err: any) {
      if (err.response?.status === 410) {
        setError('This test has already been completed and the link has expired.');
      } else if (err.response?.status === 403) {
        setError('This test has been closed.');
      } else if (err.response?.status === 404) {
        setError('Test not found. Please check your link.');
      } else {
        setError('Invalid or expired test link.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRatings = async () => {
    try {
      const response = await axios.get<Rating[]>(
        `http://localhost:3000/api/test/${token}/ratings`
      );
      setRatings(response.data);
    } catch (err) {
      console.error('Failed to fetch ratings');
    }
  };

  const handleRatingSubmit = async (stars: number, comment: string) => {
    if (!testData) return;

    const currentMedia = testData.media_files[currentIndex];
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      await axios.post(
        `http://localhost:3000/api/test/${token}/ratings`,
        {
          media_file_id: currentMedia.id,
          stars,
          comment: comment || null,
        }
      );

      fetchUserRatings();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('This test has been closed.');
      } else {
        setError('Failed to save rating. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentRating = (mediaId: number): Rating | undefined => {
    return ratings.find((r) => r.media_file_id === mediaId);
  };

  const getProgress = () => {
    if (!testData) return 0;
    const ratedCount = testData.media_files.filter((m) =>
      ratings.some((r) => r.media_file_id === m.id)
    ).length;
    return (ratedCount / testData.media_files.length) * 100;
  };

  const areAllMediaRated = () => {
    if (!testData) return false;
    return ratings.length === testData.media_files.length;
  };

  const handleFinishTest = async () => {
    try {
      await axios.post(`http://localhost:3000/api/test/${token}/complete`);
      setTestCompleted(true);
      setSuccessMessage('Test completed! Thank you for your ratings. This link is now expired.');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Test not found.');
      } else {
        setError('Failed to complete test. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading test...</p>
      </div>
    );
  }

  if (error && !testData) {
    return (
      <div style={styles.error}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!testData) {
    return null;
  }

  const currentMedia = testData.media_files[currentIndex];
  const currentRating = getCurrentRating(currentMedia.id);
  const progress = getProgress();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{testData.test.name}</h1>
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
          <p style={styles.progressText}>
            {ratings.length} of {testData.media_files.length} rated
          </p>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.navigation}>
          <button
            onClick={() => setCurrentIndex(currentIndex - 1)}
            disabled={currentIndex === 0 || testCompleted}
            style={{
              ...styles.navButton,
              ...(currentIndex === 0 || testCompleted ? styles.navButtonDisabled : {}),
            }}
          >
            ← Previous
          </button>
          <span style={styles.navText}>
            {currentIndex + 1} / {testData.media_files.length}
          </span>
          {currentIndex === testData.media_files.length - 1 ? (
            <button
              onClick={handleFinishTest}
              disabled={!areAllMediaRated() || testCompleted}
              style={{
                ...styles.finishButton,
                ...(!areAllMediaRated() || testCompleted ? styles.finishButtonDisabled : {}),
              }}
            >
              {testCompleted ? 'Test Completed ✓' : 'Finish Test'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              disabled={testCompleted}
              style={{
                ...styles.navButton,
                ...(testCompleted ? styles.navButtonDisabled : {}),
              }}
            >
              Next →
            </button>
          )}
        </div>

        <MediaPlayer media={currentMedia} />

        {error && <div style={styles.errorMessage}>{error}</div>}
        {successMessage && <div style={styles.successMessage}>{successMessage}</div>}

        <RatingInput
          initialStars={currentRating ? Number(currentRating.stars) : 0}
          initialComment={currentRating?.comment || ''}
          onSubmit={handleRatingSubmit}
          loading={submitting || testCompleted}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.25rem',
    color: '#6b7280',
  },
  error: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '2rem',
    textAlign: 'center' as const,
  },
  header: {
    backgroundColor: 'white',
    padding: '1.5rem 2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '1rem',
  },
  progressContainer: {
    marginTop: '0.5rem',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
  },
  progressText: {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  navButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  navButtonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
  },
  navText: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
  },
  finishButton: {
    padding: '0.75rem 2rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  finishButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  errorMessage: {
    padding: '0.75rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '0.875rem',
    marginTop: '1rem',
  },
  successMessage: {
    padding: '0.75rem',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '4px',
    fontSize: '0.875rem',
    marginTop: '1rem',
  },
};
