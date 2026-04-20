import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NewsDetail from '../../components/news/NewsDetail';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function HODNews() {
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data } = await api.get('/news');
      const newsList = data.success ? data.data : (Array.isArray(data) ? data : []);
      setNews(Array.isArray(newsList) ? newsList : []);
    } catch (error) {
      toast.error('Failed to load news');
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/news/${selected._id}`);
      toast.success('News deleted');
      setShowDelete(false);
      fetchNews();
    } catch (error) {
      toast.error('Failed to delete news');
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="p-8">
      <PageHeader
        title="News"
        subtitle="Manage department news"
        breadcrumbs={['Dashboard', 'News']}
        actions={
          <button onClick={() => { setSelected(null); setShowModal(true); }} className="btn btn-primary">
            + Create News
          </button>
        }
      />

      {news.length === 0 ? (
        <EmptyState
          icon="📰"
          title="No news yet"
          subtitle="Create your first news article"
          action={
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              Create News
            </button>
          }
        />
      ) : (
        <div className="space-y-4 mt-6">
          {news.map((item) => (
            <div
              key={item._id}
              className="card p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => setSelectedDetail(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{item.content}</p>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>By {item.author?.name}</span>
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span className="px-2 py-1 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs">
                      {item.targetType?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {item.author?._id === user?._id && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(item); setShowModal(true); }}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(item); setShowDelete(true); }}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NewsModal news={selected} onClose={() => setShowModal(false)} onSuccess={fetchNews} />}
      {selectedDetail && <NewsDetail news={selectedDetail} onClose={() => setSelectedDetail(null)} />}
      {showDelete && (
        <ConfirmModal
          isOpen={showDelete}
          title="Delete News"
          message={`Delete ${selected?.title}?`}
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}

function NewsModal({ news, onClose, onSuccess }) {
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: news?.title || '',
    content: news?.content || '',
    targetType: news?.targetType || 'DEPT_ALL',
    commentsEnabled: news?.commentsEnabled ?? true
  });

  const getTargetOptions = () => [
    { value: 'DEPT_ALL', label: 'All Department Members' },
    { value: 'DEPT_TEACHERS', label: 'Department Teachers' },
    { value: 'DEPT_STUDENTS', label: 'Department Students' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('content', formData.content);
      fd.append('targetType', formData.targetType);
      fd.append('commentsEnabled', String(!!formData.commentsEnabled));
      files.forEach((f) => fd.append('attachments', f));

      if (news) {
        await api.put(`/news/${news._id}`, fd);
        toast.success('News updated');
      } else {
        await api.post('/news', fd);
        toast.success('News created');
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} title={news ? 'Edit News' : 'Create News'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="form-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Title</label>
          <input 
            type="text" 
            className="input" 
            value={formData.title} 
            onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            placeholder="Enter news title"
            required 
          />
        </div>
        
        <div className="form-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Content</label>
          <textarea 
            className="input" 
            value={formData.content} 
            onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
            placeholder="Enter news content"
            rows="6" 
            required 
          />
        </div>
        
        <div className="form-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Target Audience</label>
          <select 
            className="input" 
            value={formData.targetType} 
            onChange={(e) => setFormData({ ...formData, targetType: e.target.value })} 
            required
          >
            {getTargetOptions().map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              className="rounded" 
              checked={formData.commentsEnabled} 
              onChange={(e) => setFormData({ ...formData, commentsEnabled: e.target.checked })} 
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Enable Comments</span>
          </label>
        </div>

        <div className="form-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>PDF Attachment (Notes)</label>
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="input"
          />
        </div>
        
        <div className="flex gap-3 justify-end pt-4">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? <LoadingSpinner /> : news ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
