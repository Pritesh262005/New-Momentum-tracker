import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';
import { FileText } from 'lucide-react';

const years = [1, 2, 3, 4];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function StudentSubjects() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ year: '', semester: '' });

  useEffect(() => {
    fetchSubjects();
  }, [filters.year, filters.semester]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/student/study/subjects', { params: filters });
      const subjectList = response.data?.data || [];
      setSubjects(Array.isArray(subjectList) ? subjectList : []);
    } catch (error) {
      toast.error('Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const openSyllabus = async (subjectId) => {
    try {
      const response = await api.get(`/student/study/subjects/${subjectId}/syllabus`, { responseType: 'blob' });
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
        subtitle="View your department subjects and syllabuses"
        breadcrumbs={[{ label: 'Dashboard', path: '/student' }, { label: 'Subjects' }]}
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
        <EmptyState icon="Books" title="No subjects yet" subtitle="No subjects found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div key={subject._id} className="card p-6 hover:shadow-lg transition-shadow relative">
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

              <button
                onClick={() => openSyllabus(subject._id)}
                className="mt-2 flex items-center gap-2 text-sm text-[var(--primary)] hover:underline font-medium"
              >
                <FileText size={16} /> Syllabus PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
