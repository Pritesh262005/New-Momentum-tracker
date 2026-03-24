import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function HODExams() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    subjectIds: []
  });

  useEffect(() => {
    (async () => {
      try {
        const [{ data: examRes }, { data: subjRes }] = await Promise.all([
          api.get('/exams'),
          api.get('/hod/subjects')
        ]);

        setExams(examRes.success ? examRes.data : []);
        setSubjects(subjRes.success ? subjRes.data : []);
      } catch (e) {
        toast.error('Failed to load exams');
        setExams([]);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subjectById = useMemo(() => {
    const m = new Map();
    subjects.forEach((s) => m.set(s._id, s));
    return m;
  }, [subjects]);

  const selectedSubjects = formData.subjectIds.map((id) => subjectById.get(id)).filter(Boolean);

  const refreshExams = async () => {
    const { data } = await api.get('/exams');
    setExams(data.success ? data.data : []);
  };

  const handleToggleSubject = (id) => {
    setFormData((prev) => {
      const exists = prev.subjectIds.includes(id);
      const subjectIds = exists ? prev.subjectIds.filter((x) => x !== id) : [...prev.subjectIds, id];
      return { ...prev, subjectIds };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exams', {
        name: formData.name,
        date: new Date(formData.date).toISOString(),
        subjectIds: formData.subjectIds
      });
      toast.success('Exam created');
      setShowCreate(false);
      setFormData({ name: '', date: new Date().toISOString().slice(0, 10), subjectIds: [] });
      await refreshExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam');
    }
  };

  const openResults = async (exam) => {
    setSelectedExam(exam);
    setShowResults(true);
    try {
      setResultsLoading(true);
      const { data } = await api.get(`/exams/${exam._id}/results`);
      setResults(data.success ? data.data : null);
    } catch (err) {
      toast.error('Failed to load results');
      setResults(null);
    } finally {
      setResultsLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Exams"
        subtitle="Create exams and view department results"
        breadcrumbs={[{ label: 'Dashboard', path: '/hod' }, { label: 'Exams' }]}
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + Create Exam
          </button>
        }
      />

      {exams.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No exams yet"
          subtitle="Create your first exam to start recording marks"
          action={
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Create Exam
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam._id}
              className="card p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => openResults(exam)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{exam.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{formatDateTime(exam.date)}</span>
                    <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">
                      {exam.subjects?.length || 0} Subjects
                    </span>
                    <span className="px-2 py-1 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white">
                      {exam.department?.code || 'DEPT'}
                    </span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openResults(exam); }}>
                  View Results
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Exam" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Exam Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. CSE Midterm - March"
              required
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Exam Date</label>
            <input
              type="date"
              className="input"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Subjects</label>
            {subjects.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No subjects found. Add subjects first.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subjects.map((s) => {
                  const checked = formData.subjectIds.includes(s._id);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      className={`p-3 rounded-xl text-left border transition ${checked ? 'bg-indigo-500/15 border-indigo-500/40' : 'bg-[var(--bg-base)] border-[var(--border)] hover:border-indigo-500/30'}`}
                      onClick={() => handleToggleSubject(s._id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.code}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${checked ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
                          {checked ? '✓' : ''}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedSubjects.length > 0 && (
              <p className="text-xs mt-2 text-[var(--text-muted)]">
                Selected: {selectedSubjects.map((s) => s.code).join(', ')}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={formData.subjectIds.length === 0}>
              Create
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showResults} onClose={() => setShowResults(false)} title="Exam Results" size="xl" noPad>
        {resultsLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : results?.exam ? (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">{results.exam.subjects.length} Subjects</span>
              <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">{formatDateTime(results.exam.date)}</span>
            </div>

            <div className="overflow-auto rounded-xl border border-[var(--border)]">
              <table className="min-w-[900px] w-full text-sm">
                <thead style={{ background: 'var(--bg-base)' }}>
                  <tr>
                    <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Rank</th>
                    <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Student</th>
                    {results.exam.subjects.map((s) => (
                      <th key={s.subject} className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                        {s.code}
                      </th>
                    ))}
                    <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((row) => {
                    const marksBySubject = new Map((row.marks || []).map((m) => [m.subject?._id || m.subject, m]));
                    return (
                      <tr key={row.student._id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{row.rank}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{row.student.name}</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.student.rollNumber || '-'}</span>
                          </div>
                        </td>
                        {results.exam.subjects.map((s) => {
                          const mark = marksBySubject.get(s.subject);
                          return (
                            <td key={s.subject} className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                              {mark ? `${mark.marks}/${mark.maxMarks}` : '-'}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {row.avg?.toFixed ? row.avg.toFixed(2) : row.avg || 0}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState icon="📝" title="No results" subtitle="No data available for this exam yet" />
          </div>
        )}
      </Modal>
    </div>
  );
}

