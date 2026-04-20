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

export default function TeacherSubjects() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ year: '', semester: '' });
  const [formData, setFormData] = useState({ _id: '' });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [filters.year, filters.semester]);

  const fetchTeachers = async () => {
    try {
      // We don't necessarily need all teachers for a teacher to create a subject, 
      // but if we want them to assign co-teachers, we can keep this, though /teacher/teachers doesn't exist.
      // For now, let's just clear teachersList so they only assign themselves.
      setTeachersList([]);

    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teacher/subjects', { params: filters });
      const subjectList = response.data?.data || [];
      setSubjects(Array.isArray(subjectList) ? subjectList : []);
    } catch (error) {
      toast.error('Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (subject) => {
    setFormData({ _id: subject._id });
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    try {
      const data = new FormData();
      data.append('syllabusPdf', selectedFile);

      await api.put(`/teacher/subjects/${formData._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Material uploaded successfully');
      
      setShowModal(false);
      setFormData({ _id: '' });
      setSelectedFile(null);
      fetchSubjects();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload material');
    }
  };

  const openSyllabus = async (subjectId) => {
    try {
      const response = await api.get(`/teacher/subjects/${subjectId}/syllabus`, { responseType: 'blob' });
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
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Subjects' }]}
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
        <EmptyState icon="Books" title="No subjects yet" subtitle="No subjects assigned to you" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div key={subject._id} className="card p-6 hover:shadow-lg transition-shadow relative">
              <button 
                onClick={() => handleOpenEdit(subject)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                title="Upload Material"
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Upload Syllabus/Material" size="md">
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: '0.5rem' }}>
          <form onSubmit={handleUploadMaterial} className="space-y-5">
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Syllabus PDF</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="hidden"
                  id="syllabus-upload"
                  required
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
                Upload
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
