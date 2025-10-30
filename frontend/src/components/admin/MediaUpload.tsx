import { useState, useEffect } from 'react';
import { MdUpload, MdVisibility, MdEdit, MdDelete, MdClose } from 'react-icons/md';
import api, { getMediaUrl } from '../../utils/api';
import Modal from '../Modal';
import type { Category, MediaFile } from '../../types';

export default function MediaUpload() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [editingMedia, setEditingMedia] = useState<MediaFile | null>(null);
  const [editCategoryIds, setEditCategoryIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Determine accept attribute based on selected categories
  const getAcceptAttribute = () => {
    if (selectedCategoryIds.length === 0) return 'audio/*,video/*,image/*,text/*';
    const selectedCategories = categories.filter(cat => selectedCategoryIds.includes(cat.id));
    const mediaTypes = [...new Set(selectedCategories.map(cat => cat.media_type))];
    if (mediaTypes.length === 1) {
      return `${mediaTypes[0]}/*`;
    }
    return 'audio/*,video/*,image/*,text/*';
  };

  useEffect(() => {
    fetchCategories();
    fetchMedia();
  }, [filterType]);

  const fetchCategories = async () => {
    try {
      const response = await api.get<Category[]>('/admin/categories');
      setCategories(response.data);
    } catch (err) {
      setError('Failed to fetch categories');
    }
  };

  const fetchMedia = async () => {
    try {
      const params = filterType ? `?media_type=${filterType}` : '';
      const response = await api.get<MediaFile[]>(`/admin/media${params}`);
      setMediaFiles(response.data);
    } catch (err) {
      setError('Failed to fetch media files');
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || selectedCategoryIds.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('category_ids', selectedCategoryIds.join(','));
      files.forEach((file) => {
        formData.append('file', file);
      });

      await api.post('/admin/media/upload', formData);

      setFiles([]);
      setSelectedCategoryIds([]);
      fetchMedia();
    } catch (err: any) {
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Failed to upload media';
      setError(errorMessage);
      console.error('Upload error:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media file?')) return;

    try {
      await api.delete(`/admin/media/${id}`);
      fetchMedia();
    } catch (err) {
      setError('Failed to delete media file');
    }
  };

  const handleEditCategories = (media: MediaFile) => {
    setEditingMedia(media);
    setEditCategoryIds(media.categories.map(cat => cat.id));
    setModalOpen(true);
  };

  const handleEditCategoryToggle = (categoryId: number) => {
    setEditCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSaveCategories = async () => {
    if (!editingMedia || editCategoryIds.length === 0) return;

    try {
      await api.put(`/admin/media/${editingMedia.id}/categories`, {
        category_ids: editCategoryIds,
      });
      setModalOpen(false);
      setEditingMedia(null);
      setEditCategoryIds([]);
      fetchMedia();
    } catch (err) {
      setError('Failed to update categories');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Media Upload & Management</h2>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleUpload} style={styles.uploadForm}>
        <div style={styles.uploadSection}>
          <label style={styles.label}>Select Categories (required):</label>
          <div style={styles.checkboxGroup}>
            {categories.map((cat) => (
              <label key={cat.id} style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.includes(cat.id)}
                  onChange={() => handleCategoryToggle(cat.id)}
                  disabled={loading}
                />
                <span style={styles.checkboxLabel}>
                  {cat.name} ({cat.media_type})
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={styles.uploadSection}>
          <label style={styles.label}>Select Files:</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            style={styles.input}
            disabled={loading || selectedCategoryIds.length === 0}
            accept={getAcceptAttribute()}
          />
        </div>

        <button
          type="submit"
          disabled={loading || files.length === 0 || selectedCategoryIds.length === 0}
          style={{
            ...styles.button,
            ...(loading || files.length === 0 || selectedCategoryIds.length === 0 ? styles.buttonDisabled : {})
          }}
          className="icon-button touch-target"
        >
          <MdUpload />
          <span className="icon-button-text">{loading ? 'Uploading...' : `Upload${files.length > 0 ? ` (${files.length})` : ''}`}</span>
        </button>
      </form>

      {files.length > 0 && (
        <div style={styles.selectedFiles}>
          <h3 style={styles.selectedFilesTitle}>Selected Files ({files.length})</h3>
          <div style={styles.fileList}>
            {files.map((file, index) => (
              <div key={index} style={styles.fileItem}>
                <div style={styles.fileInfo}>
                  <span style={styles.fileName}>{file.name}</span>
                  <span style={styles.fileSize}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  style={styles.removeButton}
                  disabled={loading}
                  className="icon-button"
                  aria-label="Remove file"
                >
                  <MdClose />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.filter}>
        <label style={styles.filterLabel}>Filter by type:</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={styles.select}
        >
          <option value="">All</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="text">Text</option>
        </select>
      </div>

      <div style={styles.list}>
        {mediaFiles.length === 0 ? (
          <p style={styles.empty}>No media files yet. Upload one above!</p>
        ) : (
          mediaFiles.map((media) => (
            <div key={media.id} style={styles.listItem}>
              <span style={styles.badge}>{media.media_type}</span>
              <span style={styles.itemTitle}>{media.filename}</span>
              <div style={styles.categoryBadges}>
                {media.categories.map(cat => (
                  <span key={cat.id} style={styles.categoryBadge}>
                    {cat.name}
                  </span>
                ))}
              </div>
              <span style={styles.itemDate}>
                {new Date(media.uploaded_at).toLocaleDateString()}
              </span>
              <div style={styles.itemActions} className="button-group">
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
                  onClick={() => handleEditCategories(media)}
                  style={styles.editButton}
                  className="icon-button touch-target"
                >
                  <MdEdit />
                  <span className="icon-button-text">Edit Categories</span>
                </button>
                <button
                  onClick={() => handleDelete(media.id)}
                  style={styles.deleteButton}
                  className="icon-button touch-target"
                >
                  <MdDelete />
                  <span className="icon-button-text">Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMedia ? `Edit Categories: ${editingMedia.filename}` : 'Edit Categories'}
      >
        {editingMedia && (
          <div style={styles.modalContent}>
            <div style={styles.checkboxGroup}>
              {categories.map((cat) => (
                <label key={cat.id} style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={editCategoryIds.includes(cat.id)}
                    onChange={() => handleEditCategoryToggle(cat.id)}
                  />
                  <span style={styles.checkboxLabel}>
                    {cat.name} ({cat.media_type})
                  </span>
                </label>
              ))}
            </div>
            <button
              onClick={handleSaveCategories}
              disabled={editCategoryIds.length === 0}
              style={{
                ...styles.button,
                ...(editCategoryIds.length === 0 ? styles.buttonDisabled : {}),
                marginTop: '1rem'
              }}
            >
              Save Categories
            </button>
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
  uploadForm: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  uploadSection: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    marginBottom: '1rem',
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
  select: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    width: '100%',
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
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  filter: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  filterLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },
  empty: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '2rem',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
    gap: '1rem',
    flexWrap: 'wrap' as const,
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
    minWidth: '50px',
    textAlign: 'center' as const,
  },
  itemTitle: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
    minWidth: '200px',
  },
  categoryBadges: {
    display: 'flex',
    gap: '0.25rem',
    flexWrap: 'wrap' as const,
    flex: 1,
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  itemDate: {
    fontSize: '0.75rem',
    color: '#6b7280',
    minWidth: '100px',
  },
  itemActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    textAlign: 'center' as const,
    textDecoration: 'none',
    fontWeight: '500',
  },
  editButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  deleteButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  selectedFiles: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  selectedFilesTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.75rem',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  fileInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    flex: 1,
  },
  fileName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1f2937',
    wordBreak: 'break-word' as const,
  },
  fileSize: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  removeButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    marginLeft: '0.5rem',
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
};
