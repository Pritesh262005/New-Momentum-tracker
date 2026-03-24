import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function HODSubjects() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', credits: 3, semester: 1 });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/hod/subjects');
      const subjectList = response.data?.data || [];
      setSubjects(Array.isArray(subjectList) ? subjectList : []);
    } catch (error) {
      toast.error('Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hod/subjects', formData);
      toast.success('Subject created successfully');
      setShowModal(false);
      setFormData({ name: '', code: '', description: '', credits: 3, semester: 1 });
      fetchSubjects();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create subject');
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="p-8">
      <PageHeader
        title="Subjects"
        subtitle="Manage department subjects"
        breadcrumbs={['Dashboard', 'Subjects']}
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Subject
          </button>
        }
      />

      {!subjects || subjects.length === 0 ? (
        <EmptyState icon="📚" title="No subjects yet" subtitle="Add your first subject" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {subjects && subjects.map((subject) => (
            <div key={subject._id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl mb-4">
                📚
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{subject.name}</h3>
              <p className="text-sm font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>{subject.code}</p>
              {subject.description && (
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{subject.description}</p>
              )}
              <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Credits: {subject.credits}</span>
                {subject.semester && <span>Sem: {subject.semester}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Subject" size="md">
        <form onSubmit={handleCreateSubject} className="space-y-5">
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Subject Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Data Structures"
              required
            />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Subject Code</label>
            <input
              type="text"
              className="input"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="CS201"
              required
            />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Description</label>
            <textarea
              className="input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the subject"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Credits</label>
              <input
                type="number"
                className="input"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                min="1"
                max="6"
                required
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Semester</label>
              <input
                type="number"
                className="input"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                min="1"
                max="8"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Subject
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
