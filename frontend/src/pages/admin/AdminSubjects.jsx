import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

const years = [1, 2, 3, 4];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function AdminSubjects() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ department: '', year: '', semester: '' });
  const [formData, setFormData] = useState({
    department: '',
    name: '',
    code: '',
    description: '',
    credits: 3,
    year: 1,
    semester: 1
  });

  const fetchDepartments = async () => {
    const { data } = await api.get('/admin/departments');
    setDepartments(Array.isArray(data?.data) ? data.data : []);
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/subjects', { params: filters });
      setSubjects(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments().catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [filters.department, filters.year, filters.semester]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/subjects', formData);
      toast.success('Subject created');
      setShowModal(false);
      setFormData((prev) => ({ ...prev, name: '', code: '', description: '', credits: 3 }));
      await fetchSubjects();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create subject');
    }
  };

  const visible = useMemo(() => subjects, [subjects]);

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Subjects"
        subtitle="Manage subjects across all departments, years, and semesters"
        breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Subjects' }]}
        actions={<button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Subject</button>}
      />

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select className="input" value={filters.department} onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}>
            <option value="">All Departments</option>
            {departments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
          </select>
          <select className="input" value={filters.year} onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value, semester: '' }))}>
            <option value="">All Years</option>
            {years.map((year) => <option key={year} value={year}>{`Year ${year}`}</option>)}
          </select>
          <select className="input" value={filters.semester} onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value }))}>
            <option value="">All Semesters</option>
            {semesters.map((semester) => <option key={semester} value={semester}>{`Semester ${semester}`}</option>)}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="📚" title="No subjects found" subtitle="Create subjects for department year/semester groups" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visible.map((subject) => (
            <div key={subject._id} className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{subject.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{subject.code}</p>
                </div>
                <span className="badge badge-indigo">{`Y${subject.year} • S${subject.semester}`}</span>
              </div>
              <p className="text-sm mt-3 text-[var(--text-secondary)]">{subject.department?.name || '-'}</p>
              {subject.description ? <p className="text-sm mt-3 text-[var(--text-muted)]">{subject.description}</p> : null}
              <div className="mt-4 text-xs text-[var(--text-muted)]">{subject.credits} credits</div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Subject" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <select className="input" value={formData.department} onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))} required>
            <option value="">Select Department</option>
            {departments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
          </select>
          <input className="input" placeholder="Subject name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required />
          <input className="input" placeholder="Code" value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))} required />
          <textarea className="input" rows={3} placeholder="Description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-3 gap-4">
            <input className="input" type="number" min="1" max="6" value={formData.credits} onChange={(e) => setFormData((p) => ({ ...p, credits: Number(e.target.value) || 3 }))} required />
            <select className="input" value={formData.year} onChange={(e) => setFormData((p) => ({ ...p, year: Number(e.target.value), semester: Number(e.target.value) * 2 - 1 }))}>
              {years.map((year) => <option key={year} value={year}>{`Year ${year}`}</option>)}
            </select>
            <select className="input" value={formData.semester} onChange={(e) => setFormData((p) => ({ ...p, semester: Number(e.target.value) }))}>
              {semesters.filter((semester) => Math.ceil(semester / 2) === Number(formData.year)).map((semester) => (
                <option key={semester} value={semester}>{`Semester ${semester}`}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
