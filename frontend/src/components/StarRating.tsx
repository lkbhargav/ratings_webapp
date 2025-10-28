interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  color?: string;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 'medium',
  showLabel = false,
  color = '#f59e0b',
}: StarRatingProps) {
  const sizeMap = {
    small: '0.875rem',
    medium: '1rem',
    large: '1.5rem',
  };

  const fontSize = sizeMap[size];

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const fillPercentage =
      rating >= starValue
        ? 100
        : rating >= starValue - 0.5
        ? 50
        : 0;

    return (
      <span
        key={index}
        style={{
          ...styles.starContainer,
          fontSize,
        }}
      >
        <span style={styles.emptyStar}>☆</span>
        <span
          style={{
            ...styles.filledStar,
            width: `${fillPercentage}%`,
            color,
          }}
        >
          ★
        </span>
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.stars}>
        {Array.from({ length: maxStars }, (_, i) => renderStar(i))}
      </div>
      {showLabel && (
        <span style={styles.label}>
          {rating.toFixed(1)}/{maxStars}
        </span>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  stars: {
    display: 'inline-flex',
    gap: '0.125rem',
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
  },
  label: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },
};
