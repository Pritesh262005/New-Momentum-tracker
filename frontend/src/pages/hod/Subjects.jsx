import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';
import { FileText, Edit2 } from 'lucide-react';

const years = [1, 2, 3, 4];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function HODSubjects() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filters, setFilters] = useState({ year: '', semester: '' });
  const [formData, setFormData] = useState({
    _id: '',
    name: '',
    code: '',
    description: '',
    credits: 3,
    year: 1,
    semester: 1,
    teachers: []
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [filters.year, filters.semester]);

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/hod/teachers');
      setTeachersList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hod/subjects', { params: filters });
      const subjectList = response.data?.data || [];
      setSubjects(Array.isArray(subjectList) ? subjectList : []);
    } catch (error) {
      toast.error('Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      _id: '',
      name: '',
      code: '',
      description: '',
      credits: 3,
      year: 1,
      semester: 1,
      teachers: []
    });
    setSelectedFile(null);
    setIsEditing(false);
  };

  const handleOpenEdit = (subject) => {
    setFormData({
      _id: subject._id,
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      credits: subject.credits || 3,
      year: subject.year || 1,
      semester: subject.semester || 1,
      teachers: (subject.teachers || []).map(t => typeof t === 'object' ? t._id : t)
    });
    setSelectedFile(null);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleTeacherChange = (teacherId) => {
    setFormData(prev => {
      const newTeachers = prev.teachers.includes(teacherId)
        ? prev.teachers.filter(id => id !== teacherId)
        : [...prev.teachers, teacherId];
      return { ...prev, teachers: newTeachers };
    });
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('code', formData.code);
      data.append('description', formData.description);
      data.append('credits', formData.credits);
      data.append('year', formData.year);
      data.append('semester', formData.semester);
      data.append('teachers', JSON.stringify(formData.teachers));
      
      if (selectedFile) {
        data.append('syllabusPdf', selectedFile);
      }

      if (isEditing) {
        await api.put(`/hod/subjects/${formData._id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Subject updated successfully');
      } else {
        await api.post('/hod/subjects', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Subject created successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchSubjects();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} subject`);
    }
  };

  const openSyllabus = async (subjectId) => {
    try {
      const response = await api.get(`/hod/subjects/${subjectId}/syllabus`, { responseType: 'blob' });
      const fileURL = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(fileURL, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(fileURL), 60000);
    } catch (error) {
      toast.error('Failed to open syllabus');
    }
  };

  if (loading && subjects.length === 0) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Subjects"
        subtitle="Manage department subjects by year and semester"
        breadcrumbs={[{ label: 'Dashboard', path: '/hod' }, { label: 'Subjects' }]}
        actions={
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            + Add Subject
          </button>
        }
      />

      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Filter by Year</label>
            <select
              className="input-base"
              value={filters.year}
              onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value, semester: '' }))}
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Filter by Semester</label>
            <select
              className="input-base"
              value={filters.semester}
              onChange={(e) => setFilters((prev) => ({ ...prev, semester: e.target.value }))}
            >
              <option value="">All Semesters</option>
              {semesters
                .filter((semester) => !filters.year || Math.ceil(semester / 2) === Number(filters.year))
                .map((semester) => (
                  <option key={semester} value={semester}>Semester {semester}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {!subjects || subjects.length === 0 ? (
        <EmptyState icon="Books" title="No subjects yet" subtitle="Add your first subject" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div key={subject._id} className="card p-6 hover:shadow-lg transition-shadow relative">
              <button 
                onClick={() => handleOpenEdit(subject)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                title="Edit Subject"
              >
                <Edit2 size={18} />
              </button>
              
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-2xl mb-4 shadow-sm">
                S
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{subject.name}</h3>
              <p className="text-sm font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>{subject.code}</p>
              {subject.description ? (
                <p className="text-xs mb-3 text-[var(--text-muted)] line-clamp-2">{subject.description}</p>
              ) : null}
              <div className="flex gap-4 text-xs font-semibold mb-3 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                <span className="bg-[var(--bg-hover)] px-2 py-1 rounded">Credits: {subject.credits}</span>
                <span className="bg-[var(--bg-hover)] px-2 py-1 rounded">Year: {subject.year}</span>
                <span className="bg-[var(--bg-hover)] px-2 py-1 rounded">Sem: {subject.semester}</span>
              </div>
              
              {subject.teachers && subject.teachers.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Teachers</div>
                  <div className="flex flex-col gap-1">
                    {subject.teachers.map(t => (
                      <span key={t._id} className="text-xs text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border)] px-2 py-1 rounded w-fit">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {subject.syllabusFileName && (
                <button
                  onClick={() => openSyllabus(subject._id)}
                  className="mt-2 flex items-center gap-2 text-sm text-[var(--primary)] hover:underline font-medium"
                >
                  <FileText size={16} /> Syllabus PDF
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEditing ? "Edit Subject" : "Add New Subject"} size="md">
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: '0.5rem' }}>
          <form onSubmit={handleCreateSubject} className="space-y-5">
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Subject Name</label>
              <input
                type="text"
                className="input-base"
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
                className="input-base"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="CS201"
                required
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Description</label>
              <textarea
                className="input-base"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the subject"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Credits</label>
                <input
                  type="number"
                  className="input-base"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value, 10) || 3 })}
                  min="1"
                  max="6"
                  required
                />
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Year</label>
                <select
                  className="input-base"
                  value={formData.year}
                  onChange={(e) => {
                    const year = parseInt(e.target.value, 10);
                    const semesterOptions = semesters.filter((semester) => Math.ceil(semester / 2) === year);
                    setFormData({ ...formData, year, semester: semesterOptions[0] });
                  }}
                  required
                >
                  {years.map((year) => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Semester</label>
              <select
                className="input-base"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value, 10) })}
                required
              >
                {semesters
                  .filter((semester) => Math.ceil(semester / 2) === Number(formData.year))
                  .map((semester) => (
                    <option key={semester} value={semester}>Semester {semester}</option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Teachers (Optional)</label>
              <div className="border border-[var(--border)] rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 bg-[var(--bg-base)]">
                {teachersList.map((teacher) => (
                  <label key={teacher._id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-[var(--bg-hover)] rounded">
                    <input
                      type="checkbox"
                      checked={formData.teachers.includes(teacher._id)}
                      onChange={() => handleTeacherChange(teacher._id)}
                      className="rounded border-[var(--border)]"
                    />
                    <span className="text-sm font-medium">{teacher.name}</span>
                  </label>
                ))}
                {teachersList.length === 0 && <span className="text-sm text-[var(--text-muted)]">No teachers available.</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Syllabus PDF (Optional)</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="hidden"
                  id="syllabus-upload"
                />
                <label
                  htmlFor="syllabus-upload"
                  className="btn btn-secondary cursor-pointer flex items-center gap-2"
                >
                  <FileText size={16} /> Choose File
                </label>
                <div className="text-sm text-[var(--text-secondary)] truncate flex-1">
                  {selectedFile ? selectedFile.name : 'No file chosen'}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 sticky bottom-0 bg-[var(--bg-overlay)] p-2 -mx-2 rounded-xl">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Save Changes' : 'Add Subject'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
