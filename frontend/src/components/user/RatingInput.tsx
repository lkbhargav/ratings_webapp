import { useState, useEffect, useRef } from 'react';

interface RatingInputProps {
  initialStars?: number;
  initialComment?: string;
  onSubmit: (stars: number, comment: string) => void;
  loading?: boolean;
}

export default function RatingInput({
  initialStars = 0,
  initialComment = '',
  onSubmit,
  loading = false,
}: RatingInputProps) {
  const [stars, setStars] = useState(initialStars);
  const [comment, setComment] = useState(initialComment);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    setStars(initialStars);
    setComment(initialComment);
  }, [initialStars, initialComment]);

  // Auto-save immediately when stars change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (stars > 0) {
      onSubmit(stars, comment);
    }
  }, [stars]);

  // Auto-save with debounce when comment changes
  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }

    if (stars === 0) {
      return; // Don't save comment without stars
    }

    const timeoutId = setTimeout(() => {
      onSubmit(stars, comment);
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [comment]);

  const handleStarClick = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const buttonWidth = rect.width;

    // Click on left half = half star (e.g., 2.5)
    // Click on right half = full star (e.g., 3.0)
    const isLeftHalf = clickX < buttonWidth / 2;
    const newRating = isLeftHalf ? index - 0.5 : index;

    setStars(newRating);
  };

  const handleStarHover = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const buttonWidth = rect.width;

    const isLeftHalf = hoverX < buttonWidth / 2;
    const hoverRating = isLeftHalf ? index - 0.5 : index;

    setHoveredStar(hoverRating);
  };

  const renderStar = (index: number) => {
    const effectiveRating = hoveredStar !== null ? hoveredStar : stars;
    const starValue = index;

    const fillPercentage =
      effectiveRating >= starValue
        ? 100
        : effectiveRating >= starValue - 0.5
        ? 50
        : 0;

    return (
      <button
        key={index}
        type="button"
        onClick={(e) => handleStarClick(e, index)}
        onMouseMove={(e) => handleStarHover(e, index)}
        onMouseLeave={() => setHoveredStar(null)}
        style={styles.star}
        disabled={loading}
      >
        <span style={styles.starContainer}>
          <span style={styles.emptyStar}>☆</span>
          <span
            style={{
              ...styles.filledStar,
              width: `${fillPercentage}%`,
            }}
          >
            ★
          </span>
        </span>
      </button>
    );
  };

  return (
    <div style={styles.form}>
      <div style={styles.section}>
        <label style={styles.label}>Your Rating:</label>
        <div style={styles.starWrapper}>
          {[1, 2, 3, 4, 5].map(renderStar)}
          <span style={styles.starCount}>
            {stars > 0 ? `${stars.toFixed(1)}/5` : 'Not rated yet'}
          </span>
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Comments (optional):</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this media..."
          style={styles.textarea}
          disabled={loading}
          rows={4}
        />
        {loading && (
          <p style={styles.savingStatus}>Saving...</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  form: {
    backgroundColor: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '8px',
    marginTop: '1rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  starWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  star: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    cursor: 'pointer',
    padding: '0.25rem',
    transition: 'transform 0.1s',
    position: 'relative' as const,
  },
  starContainer: {
    position: 'relative' as const,
    display: 'inline-block',
    lineHeight: 1,
  },
  emptyStar: {
    color: '#d1d5db',
  },
  filledStar: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    color: '#f59e0b',
  },
  starCount: {
    marginLeft: '0.5rem',
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
  savingStatus: {
    marginTop: '0.5rem',
    fontSize: '0.813rem',
    color: '#6b7280',
    fontStyle: 'italic' as const,
  },
};
