import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MdNavigateBefore, MdNavigateNext, MdCheck } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../utils/api';
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
  const [finishingTest, setFinishingTest] = useState(false);
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
      const response = await api.get<TestDetailsResponse>(
        `/test/${token}`
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
      const response = await api.get<Rating[]>(
        `/test/${token}/ratings`
      );
      setRatings(response.data);
    } catch (err) {
      console.error('Failed to fetch ratings');
    }
  };

  const handleRatingSubmit = useCallback(async (stars: number, comment: string) => {
    if (!testData) return;

    const currentMedia = testData.media_files[currentIndex];
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      await api.post(
        `/test/${token}/ratings`,
        {
          media_file_id: currentMedia.id,
          stars,
          comment: comment || null,
        }
      );

      // Update local ratings state without refetching
      setRatings((prevRatings) => {
        const existingIndex = prevRatings.findIndex(r => r.media_file_id === currentMedia.id);
        const newRating: Rating = {
          id: existingIndex >= 0 ? prevRatings[existingIndex].id : Date.now(), // Use existing id or temp id
          test_user_id: prevRatings[0]?.test_user_id || 0,
          media_file_id: currentMedia.id,
          stars,
          comment: comment || null,
          rated_at: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
          // Update existing rating
          const updated = [...prevRatings];
          updated[existingIndex] = newRating;
          return updated;
        } else {
          // Add new rating
          return [...prevRatings, newRating];
        }
      });
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('This test has been closed.');
      } else {
        setError('Failed to save rating. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [testData, currentIndex, token]);

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
    setFinishingTest(true);
    setError('');
    setSuccessMessage('');

    try {
      await api.post(`/test/${token}/complete`);
      setTestCompleted(true);
      toast.success('Test completed! Thank you for your ratings. This link is now expired.');
      setSuccessMessage('Test completed! Thank you for your ratings. This link is now expired.');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Test not found.');
        toast.error('Test not found.');
      } else {
        setError('Failed to complete test. Please try again.');
        toast.error('Failed to complete test. Please try again.');
      }
    } finally {
      setFinishingTest(false);
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
        {testData.test.description && (
          <p style={styles.description}>{testData.test.description}</p>
        )}
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
        <div style={styles.navigation} className="button-group">
          <button
            onClick={() => setCurrentIndex(currentIndex - 1)}
            disabled={currentIndex === 0 || testCompleted}
            style={{
              ...styles.navButton,
              ...(currentIndex === 0 || testCompleted ? styles.navButtonDisabled : {}),
            }}
            className="icon-button touch-target"
            aria-label="Previous"
          >
            <MdNavigateBefore />
            <span className="icon-button-text">Previous</span>
          </button>
          <span style={styles.navText}>
            {currentIndex + 1} / {testData.media_files.length}
          </span>
          {currentIndex === testData.media_files.length - 1 ? (
            <button
              onClick={handleFinishTest}
              disabled={!areAllMediaRated() || testCompleted || finishingTest}
              style={{
                ...styles.finishButton,
                ...(!areAllMediaRated() || testCompleted || finishingTest ? styles.finishButtonDisabled : {}),
              }}
              className="icon-button touch-target"
              aria-label="Finish Test"
            >
              <MdCheck />
              <span className="icon-button-text">
                {testCompleted ? 'Test Completed ✓' : finishingTest ? 'Saving...' : 'Finish Test'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              disabled={testCompleted}
              style={{
                ...styles.navButton,
                ...(testCompleted ? styles.navButtonDisabled : {}),
              }}
              className="icon-button touch-target"
              aria-label="Next"
            >
              <span className="icon-button-text">Next</span>
              <MdNavigateNext />
            </button>
          )}
        </div>

        <MediaPlayer media={currentMedia} loop={testData.test.loop_media} />

        {error && <div style={styles.errorMessage}>{error}</div>}
        {successMessage && <div style={styles.successMessage}>{successMessage}</div>}

        <RatingInput
          key={currentMedia.id}
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
    padding: 'clamp(1rem, 2vw, 1.5rem) clamp(1rem, 3vw, 2rem)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  description: {
    fontSize: '0.938rem',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '1rem',
    whiteSpace: 'pre-wrap' as const,
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
    padding: 'clamp(1rem, 2vw, 2rem)',
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
