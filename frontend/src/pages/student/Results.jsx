import { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProgressBar from '../../components/common/ProgressBar';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, getGrade } from '../../utils/formatters';
import api from '../../api/axios';

export default function StudentResults() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);

  const [tab, setTab] = useState('tests'); // tests | exams
  const [examsLoading, setExamsLoading] = useState(false);
  const [exams, setExams] = useState([]);

  const [showMarksheet, setShowMarksheet] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [marksheetLoading, setMarksheetLoading] = useState(false);
  const [marksheet, setMarksheet] = useState(null); // { exam, result }

  useEffect(() => {
    fetchTestResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 'exams' && exams.length === 0 && !examsLoading) {
      fetchExams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const fetchTestResults = async () => {
    try {
      const response = await api.get('/student/results');
      const resultData = response.data?.data || [];
      setResults(Array.isArray(resultData) ? resultData : []);
    } catch (error) {
      toast.error('Failed to load results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      setExamsLoading(true);
      const { data } = await api.get('/exams');
      setExams(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      toast.error('Failed to load exams');
      setExams([]);
    } finally {
      setExamsLoading(false);
    }
  };

  const openMarksheet = async (exam) => {
    setSelectedExam(exam);
    setShowMarksheet(true);
    try {
      setMarksheetLoading(true);
      const { data } = await api.get(`/exams/${exam._id}/my-result`);
      setMarksheet(data?.success ? data.data : null);
    } catch (error) {
      toast.error('Failed to load marksheet');
      setMarksheet(null);
    } finally {
      setMarksheetLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title={tab === 'tests' ? 'Results' : 'Exam Results'}
        subtitle={tab === 'tests' ? 'View your test results' : 'View your exam marksheet'}
        breadcrumbs={['Dashboard', 'Results']}
      />

      <div className="card p-6 mb-6">
        <div className="flex gap-3">
          <button onClick={() => setTab('tests')} className={tab === 'tests' ? 'btn-primary' : 'btn-secondary'}>
            Tests
          </button>
          <button onClick={() => setTab('exams')} className={tab === 'exams' ? 'btn-primary' : 'btn-secondary'}>
            Exams
          </button>
        </div>
      </div>

      {tab === 'tests' ? (
        !results || results.length === 0 ? (
          <EmptyState icon="📊" title="No results yet" subtitle="Complete tests to see results" />
        ) : (
          <div className="space-y-4">
            {results.map((result) => {
              const grade = getGrade(result.percentage);
              return (
                <div key={result._id} className="card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{result.test?.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">{result.test?.subject?.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-[var(--primary)] mb-1">{result.percentage}%</div>
                      <span className={`badge badge-${grade.color}`}>{grade.label}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Score</p>
                      <p className="font-semibold">{result.score}/{result.totalScore}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Correct</p>
                      <p className="font-semibold text-green-500">{result.correctAnswers}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Wrong</p>
                      <p className="font-semibold text-red-500">{result.wrongAnswers}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Submitted</p>
                      <p className="font-semibold text-sm">{formatDateTime(result.submittedAt)}</p>
                    </div>
                  </div>

                  <ProgressBar
                    value={result.percentage}
                    color={grade.color === 'green' ? 'green' : grade.color === 'red' ? 'red' : 'amber'}
                  />
                </div>
              );
            })}
          </div>
        )
      ) : examsLoading ? (
        <LoadingSpinner fullscreen />
      ) : !exams || exams.length === 0 ? (
        <EmptyState icon="🧾" title="No exams found" subtitle="No exams available for your department" />
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam._id}
              className="card p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => openMarksheet(exam)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{exam.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{formatDateTime(exam.date)}</span>
                    <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">
                      {exam.subjects?.length || 0} Subjects
                    </span>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">View marksheet</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showMarksheet}
        onClose={() => {
          setShowMarksheet(false);
          setMarksheet(null);
          setSelectedExam(null);
        }}
        title="Marksheet"
        size="lg"
        noPad
      >
        {marksheetLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : marksheet?.exam ? (
          (() => {
            const exam = marksheet.exam || selectedExam;
            const result = marksheet.result;
            const marksBySubject = new Map((result?.marks || []).map((m) => [String(m.subject?._id || m.subject), m]));
            const avg = result?.avg ?? 0;
            const grade = getGrade(avg);

            return (
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{exam?.name || 'Exam'}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{exam?.date ? formatDateTime(exam.date) : ''}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--primary)]">{avg}%</div>
                    <span className={`badge badge-${grade.color}`}>{grade.label}</span>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Student</p>
                      <p className="font-semibold text-[var(--text-primary)]">{user?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Roll No</p>
                      <p className="font-semibold text-[var(--text-primary)]">{user?.rollNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Total</p>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {result ? `${result.totalMarks || 0}/${result.totalMaxMarks || 0}` : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {!result ? (
                  <EmptyState icon="🕒" title="Result not published" subtitle="Marks are not available for this exam yet" />
                ) : (
                  <div className="overflow-auto rounded-xl border border-[var(--border)]">
                    <table className="min-w-[720px] w-full text-sm">
                      <thead style={{ background: 'var(--bg-base)' }}>
                        <tr>
                          <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Subject</th>
                          <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Code</th>
                          <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Marks</th>
                          <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Max</th>
                          <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(exam?.subjects || []).map((s) => {
                          const mark = marksBySubject.get(String(s.subject));
                          const m = mark ? mark.marks : null;
                          const mm = mark ? mark.maxMarks : null;
                          const pct = mark && mm ? Math.round((m / mm) * 10000) / 100 : null;
                          return (
                            <tr key={s.subject} className="border-t" style={{ borderColor: 'var(--border)' }}>
                              <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</td>
                              <td className="px-4 py-3 text-[var(--text-secondary)]">{s.code}</td>
                              <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{mark ? m : '-'}</td>
                              <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{mark ? mm : '-'}</td>
                              <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{pct === null ? '-' : `${pct}%`}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="p-6">
            <EmptyState icon="🧾" title="No data" subtitle="Unable to load marksheet for this exam" />
          </div>
        )}
      </Modal>
    </div>
  );
}
