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

export default function AdminNews() {
  const toast = useToast();
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
    <div className="page-container">
      <PageHeader
        title="News"
        subtitle="Manage news articles"
        breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'News' }]}
        actions={<button onClick={() => { setSelected(null); setShowModal(true); }} className="btn-primary">+ Add News</button>}
      />

      {news.length === 0 ? (
        <EmptyState
          icon="📰"
          title="No news yet"
          subtitle="Create your first news article"
          action={
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              Add News
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <div
              key={item._id}
              className="card p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => setSelectedDetail(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{item.content}</p>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span>By {item.author?.name}</span>
                    <span>{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(item); setShowModal(true); }}
                    className="btn-secondary btn-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(item); setShowDelete(true); }}
                    className="btn-danger btn-sm"
                  >
                    Delete
                  </button>
                </div>
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
  const [departments, setDepartments] = useState([]);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: news?.title || '',
    content: news?.content || '',
    targetType: news?.targetType || getDefaultTargetType(user?.role),
    targetDepartment: news?.targetDepartment || '',
    commentsEnabled: news?.commentsEnabled ?? true
  });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchDepartments();
    }
  }, [user]);

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/admin/departments');
      setDepartments(data.success ? data.data : []);
    } catch (error) {
      console.error('Failed to load departments');
    }
  };

  const getTargetOptions = (role) => {
    switch (role) {
      case 'ADMIN':
        return [
          { value: 'ALL_USERS', label: 'All Users' },
          { value: 'ALL_DEPARTMENTS', label: 'All Departments' },
          { value: 'SPECIFIC_DEPARTMENT', label: 'Specific Department' },
          { value: 'ALL_HOD', label: 'All HODs' },
          { value: 'ALL_TEACHERS', label: 'All Teachers' },
          { value: 'ALL_STUDENTS', label: 'All Students' }
        ];
      case 'HOD':
        return [
          { value: 'DEPT_ALL', label: 'All Department Members' },
          { value: 'DEPT_TEACHERS', label: 'Department Teachers' },
          { value: 'DEPT_STUDENTS', label: 'Department Students' }
        ];
      case 'TEACHER':
        return [
          { value: 'DEPT_STUDENTS', label: 'Department Students' }
        ];
      default:
        return [];
    }
  };

  function getDefaultTargetType(role) {
    switch (role) {
      case 'ADMIN': return 'ALL_USERS';
      case 'HOD': return 'DEPT_ALL';
      case 'TEACHER': return 'DEPT_STUDENTS';
      default: return 'ALL_USERS';
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('content', formData.content);
      fd.append('targetType', formData.targetType);
      if (formData.targetDepartment) fd.append('targetDepartment', formData.targetDepartment);
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
            {getTargetOptions(user?.role).map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        {user?.role === 'ADMIN' && formData.targetType === 'SPECIFIC_DEPARTMENT' && (
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Department</label>
            <select 
              className="input" 
              value={formData.targetDepartment} 
              onChange={(e) => setFormData({ ...formData, targetDepartment: e.target.value })} 
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
        )}
        
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
          <p className="text-xs mt-1 text-[var(--text-muted)]">
            Attach PDF notes to share with the selected audience.
          </p>
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
