import { useState, useEffect } from 'react';
import { MdAdd, MdDelete, MdVisibility } from 'react-icons/md';
import api, { getMediaUrl } from '../../utils/api';
import { formatDate } from '../../utils/dateFormatters';
import type { Category, MediaFile } from '../../types';
import Modal from '../Modal';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryMediaType, setNewCategoryMediaType] = useState<'audio' | 'video' | 'image' | 'text'>('audio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryMediaFiles, setCategoryMediaFiles] = useState<MediaFile[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get<Category[]>('/admin/categories');
      setCategories(response.data);
    } catch (err) {
      setError('Failed to fetch categories');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/admin/categories', {
        name: newCategoryName,
        media_type: newCategoryMediaType
      });
      setNewCategoryName('');
      setNewCategoryMediaType('audio');
      fetchCategories();
    } catch (err: any) {
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Failed to create category';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (category: Category) => {
    setSelectedCategory(category);
    setModalLoading(true);

    try {
      const response = await api.get<MediaFile[]>(`/admin/media?category_id=${category.id}`);
      setCategoryMediaFiles(response.data);
    } catch (err) {
      setError('Failed to fetch media files');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedCategory(null);
    setCategoryMediaFiles([]);
  };

  const handleDeleteMedia = async (mediaId: number) => {
    if (!confirm('Are you sure you want to delete this media file?')) return;

    try {
      await api.delete(`/admin/media/${mediaId}`);
      // Refresh the media files list
      if (selectedCategory) {
        const response = await api.get<MediaFile[]>(`/admin/media?category_id=${selectedCategory.id}`);
        setCategoryMediaFiles(response.data);
      }
    } catch (err) {
      setError('Failed to delete media file');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await api.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      setError('Failed to delete category');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Manage Categories</h2>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleCreate} style={styles.form} className="button-group">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name"
          style={styles.input}
          disabled={loading}
        />
        <select
          value={newCategoryMediaType}
          onChange={(e) => setNewCategoryMediaType(e.target.value as 'audio' | 'video' | 'image' | 'text')}
          style={styles.select}
          disabled={loading}
        >
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="text">Text</option>
        </select>
        <button type="submit" disabled={loading} style={styles.button} className="icon-button touch-target">
          <MdAdd />
          <span className="icon-button-text">{loading ? 'Creating...' : 'Create Category'}</span>
        </button>
      </form>

      <div style={styles.list}>
        {categories.length === 0 ? (
          <p style={styles.empty}>No categories yet. Create one above!</p>
        ) : (
          categories.map((category) => (
            <div key={category.id} style={styles.item}>
              <div
                style={styles.itemClickable}
                onClick={() => handleCategoryClick(category)}
              >
                <div style={styles.itemHeader}>
                  <h3 style={styles.itemTitle}>{category.name}</h3>
                  <span style={styles.mediaBadge}>{category.media_type}</span>
                </div>
                <p style={styles.itemDate}>
                  Created: {formatDate(category.created_at)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(category.id);
                }}
                style={styles.deleteButton}
                className="icon-button touch-target"
              >
                <MdDelete />
                <span className="icon-button-text">Delete</span>
              </button>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={selectedCategory !== null}
        onClose={handleCloseModal}
        title={`Media Files in "${selectedCategory?.name}"`}
      >
        {modalLoading ? (
          <p style={styles.loading}>Loading media files...</p>
        ) : categoryMediaFiles.length === 0 ? (
          <p style={styles.empty}>No media files in this category yet.</p>
        ) : (
          <div style={styles.mediaList}>
            {categoryMediaFiles.map((media) => (
              <div key={media.id} style={styles.mediaItem}>
                <span style={styles.mediaTypeBadge}>{media.media_type}</span>
                <span style={styles.mediaTitle}>{media.filename}</span>
                <span style={styles.mediaInfo}>
                  {formatDate(media.uploaded_at)}
                </span>
                <div style={styles.mediaActions} className="button-group">
                  <a
                    href={getMediaUrl(media.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.viewButton}
                    className="icon-button touch-target"
                  >
                    <MdVisibility />
                    <span className="icon-button-text">View</span>
                  </a>
                  <button
                    onClick={() => handleDeleteMedia(media.id)}
                    style={styles.deleteMediaButton}
                    className="icon-button touch-target"
                  >
                    <MdDelete />
                    <span className="icon-button-text">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    padding: 'clamp(1rem, 2vw, 1.5rem)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  heading: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
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
  form: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap' as const,
  },
  input: {
    flex: 1,
    minWidth: '200px',
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
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  itemClickable: {
    flex: 1,
    cursor: 'pointer',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  itemTitle: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#1f2937',
  },
  mediaBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'capitalize' as const,
  },
  itemDate: {
    fontSize: '0.75rem',
    color: '#6b7280',
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
  loading: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '2rem',
  },
  mediaList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },
  mediaItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },
  mediaTypeBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    minWidth: '60px',
    textAlign: 'center' as const,
  },
  mediaTitle: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
    wordBreak: 'break-word' as const,
  },
  mediaInfo: {
    fontSize: '0.75rem',
    color: '#6b7280',
    minWidth: '100px',
  },
  mediaActions: {
    display: 'flex',
    gap: '0.5rem',
    marginLeft: 'auto',
  },
  viewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    textAlign: 'center' as const,
    textDecoration: 'none',
  },
  deleteMediaButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
};
