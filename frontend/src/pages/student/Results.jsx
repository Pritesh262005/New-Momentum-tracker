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
  const [filters, setFilters] = useState({ year: '', semester: '' });

  const years = [1, 2, 3, 4];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const [showMarksheet, setShowMarksheet] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [marksheetLoading, setMarksheetLoading] = useState(false);
  const [marksheet, setMarksheet] = useState(null); // { exam, result }

  const [showAttempt, setShowAttempt] = useState(false);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [tutorBusyByQ, setTutorBusyByQ] = useState({});
  const [tutorExplainByQ, setTutorExplainByQ] = useState({});
  const [tutorFeedback, setTutorFeedback] = useState(null);
  const [tutorFeedbackBusy, setTutorFeedbackBusy] = useState(false);

  useEffect(() => {
    fetchTestResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 'exams') {
      fetchExams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filters.year, filters.semester]);

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
      const { data } = await api.get('/exams', { params: filters });
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

  const openAttempt = async (attemptId) => {
    setSelectedAttemptId(attemptId);
    setShowAttempt(true);
    setTutorExplainByQ({});
    setTutorBusyByQ({});
    setTutorFeedback(null);
    try {
      setAttemptLoading(true);
      const { data } = await api.get(`/mcq/attempt/${attemptId}/result`);
      setAttempt(data?.success ? data.data : null);
    } catch (error) {
      toast.error('Failed to load attempt');
      setAttempt(null);
    } finally {
      setAttemptLoading(false);
    }
  };

  const explainQuestion = async (questionIndex) => {
    if (!selectedAttemptId) return;
    setTutorBusyByQ((p) => ({ ...p, [questionIndex]: true }));
    try {
      const { data } = await api.post('/ai-tutor/mcq/explain', {
        attemptId: selectedAttemptId,
        questionIndex
      });
      const exp = data?.success ? data.data?.explanation : null;
      setTutorExplainByQ((p) => ({ ...p, [questionIndex]: exp }));
    } catch (error) {
      toast.error('AI Tutor failed (using fallback if available)');
    } finally {
      setTutorBusyByQ((p) => ({ ...p, [questionIndex]: false }));
    }
  };

  const generateFeedback = async () => {
    if (!selectedAttemptId) return;
    setTutorFeedbackBusy(true);
    try {
      const { data } = await api.post('/ai-tutor/mcq/feedback', { attemptId: selectedAttemptId });
      const fb = data?.success ? data.data?.feedback : null;
      setTutorFeedback(fb);
    } catch (error) {
      toast.error('Failed to generate feedback');
      setTutorFeedback(null);
    } finally {
      setTutorFeedbackBusy(false);
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <button onClick={() => setTab('tests')} className={tab === 'tests' ? 'btn-primary' : 'btn-secondary'}>
              Tests
            </button>
            <button onClick={() => setTab('exams')} className={tab === 'exams' ? 'btn-primary' : 'btn-secondary'}>
              Exams
            </button>
          </div>

          {tab === 'exams' && (
            <div className="flex flex-wrap gap-4">
              <div className="form-group mb-0">
                <select
                  className="input-base py-2 px-3 text-sm"
                  value={filters.year}
                  onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value, semester: '' }))}
                >
                  <option value="">All Years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
              <div className="form-group mb-0">
                <select
                  className="input-base py-2 px-3 text-sm"
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
          )}
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
                      <p className="font-semibold" style={{ color: 'var(--success)' }}>{result.correctAnswers}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Wrong</p>
                      <p className="font-semibold" style={{ color: 'var(--danger)' }}>{result.wrongAnswers}</p>
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

                  <div className="mt-4 flex justify-end">
                    <button className="btn-secondary" onClick={() => openAttempt(result._id)}>
                      Review + AI Tutor
                    </button>
                  </div>
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
                    {(exam.targetYear || exam.targetSemester) && (
                      <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
                        {exam.targetYear ? `Y${exam.targetYear}` : ''} {exam.targetSemester ? `S${exam.targetSemester}` : ''}
                      </span>
                    )}
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

      <Modal
        isOpen={showAttempt}
        onClose={() => {
          setShowAttempt(false);
          setSelectedAttemptId(null);
          setAttempt(null);
          setTutorExplainByQ({});
          setTutorBusyByQ({});
          setTutorFeedback(null);
        }}
        title="Test Review"
        size="lg"
        noPad
      >
        {attemptLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : !attempt?.test ? (
          <div className="p-6">
            <EmptyState icon="🧠" title="No data" subtitle="Unable to load attempt details" />
          </div>
        ) : (
          (() => {
            const test = attempt.test;
            const answersByIndex = new Map((attempt.answers || []).map((a) => [a.questionIndex, a]));
            const pct = Math.round((attempt.percentage || 0) * 100) / 100;
            const grade = getGrade(pct);

            return (
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{test.title}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{attempt.submittedAt ? formatDateTime(attempt.submittedAt) : ''}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--primary)]">{pct}%</div>
                    <span className={`badge badge-${grade.color}`}>{grade.label}</span>
                  </div>
                </div>

                <div className="card p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Tutor Feedback</div>
                    <button className="btn-secondary" disabled={tutorFeedbackBusy} onClick={generateFeedback}>
                      {tutorFeedbackBusy ? 'Generating…' : 'Generate'}
                    </button>
                  </div>
                  {tutorFeedback?.text ? (
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {tutorFeedback.text}
                      <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Provider: {tutorFeedback.provider}{tutorFeedback.cached ? ' (cached)' : ''}{tutorFeedback.model ? ` • ${tutorFeedback.model}` : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Get short feedback on your performance (free model / fallback).
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(test.questions || []).map((q, i) => {
                    const ans = answersByIndex.get(i);
                    const selected = Number.isInteger(ans?.selectedOption) ? ans.selectedOption : null;
                    const correct = q.correctAnswer;
                    const isCorrect = selected !== null && selected === correct;
                    const exp = tutorExplainByQ[i];
                    const busy = Boolean(tutorBusyByQ[i]);

                    return (
                      <div key={q._id || i} className="card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                              Q{i + 1}. {q.questionText}
                            </div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(q.options || []).slice(0, 4).map((opt, oi) => {
                                const isSel = selected === oi;
                                const isKey = correct === oi;
                                const border = isKey ? 'border-emerald-500' : isSel ? 'border-indigo-500' : 'border-[var(--border)]';
                                const bg = isKey ? 'bg-emerald-500/10' : isSel ? 'bg-indigo-500/10' : 'bg-[var(--bg-base)]';
                                return (
                                  <div
                                    key={oi}
                                    className={`p-3 rounded-lg border ${border} ${bg}`}
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    <span className="font-semibold mr-2" style={{ color: 'var(--text-primary)' }}>
                                      {String.fromCharCode(65 + oi)}.
                                    </span>
                                    {opt}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`badge badge-${isCorrect ? 'green' : 'red'}`}>
                              {isCorrect ? 'Correct' : 'Wrong'}
                            </span>
                          </div>
                        </div>

                        {!isCorrect && (
                          <div className="mt-4">
                            <button className="btn-secondary" disabled={busy} onClick={() => explainQuestion(i)}>
                              {busy ? 'Explaining…' : 'Explain with AI Tutor'}
                            </button>
                          </div>
                        )}

                        {exp?.text && (
                          <div className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {exp.text}
                            <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                              Provider: {exp.provider}{exp.cached ? ' (cached)' : ''}{exp.model ? ` • ${exp.model}` : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        )}
      </Modal>
    </div>
  );
}
