import { getMediaUrl } from '../../utils/api';
import type { MediaFile } from '../../types';

interface MediaPlayerProps {
  media: MediaFile;
}

export default function MediaPlayer({ media }: MediaPlayerProps) {
  const mediaUrl = getMediaUrl(media.id);

  const renderMedia = () => {
    switch (media.media_type) {
      case 'audio':
        return (
          <audio controls style={styles.media}>
            <source src={mediaUrl} type={media.mime_type} />
            Your browser does not support the audio element.
          </audio>
        );

      case 'video':
        return (
          <video controls style={styles.media}>
            <source src={mediaUrl} type={media.mime_type} />
            Your browser does not support the video element.
          </video>
        );

      case 'image':
        return (
          <img
            src={mediaUrl}
            alt={media.filename}
            style={styles.image}
          />
        );

      case 'text':
        return (
          <iframe
            src={mediaUrl}
            title={media.filename}
            style={styles.textFrame}
          />
        );

      default:
        return <p style={styles.unsupported}>Unsupported media type</p>;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.filename}>{media.filename}</h3>
        <span style={styles.badge}>{media.media_type}</span>
      </div>
      <div style={styles.playerContainer}>
        {renderMedia()}
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  filename: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
    wordBreak: 'break-word' as const,
    flex: 1,
  },
  badge: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    marginLeft: '0.5rem',
  },
  playerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    maxWidth: '600px',
    borderRadius: '4px',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '500px',
    borderRadius: '4px',
    objectFit: 'contain' as const,
  },
  textFrame: {
    width: '100%',
    height: '400px',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
  },
  unsupported: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '2rem',
  },
};
