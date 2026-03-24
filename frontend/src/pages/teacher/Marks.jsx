import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function TeacherMarks() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [saving, setSaving] = useState(false);

  const [marks, setMarks] = useState({}); // subjectId -> { marks, maxMarks }
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: examRes }, { data: studentRes }] = await Promise.all([
          api.get('/exams'),
          api.get('/teacher/students')
        ]);
        setExams(examRes.success ? examRes.data : []);
        setStudents(studentRes.success ? studentRes.data : []);
      } catch (e) {
        toast.error('Failed to load exams/students');
        setExams([]);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const examById = useMemo(() => {
    const m = new Map();
    exams.forEach((e) => m.set(e._id, e));
    return m;
  }, [exams]);

  const selectedExam = selectedExamId ? examById.get(selectedExamId) : null;

  const selectedStudent = useMemo(() => {
    const id = selectedStudentId;
    if (!id) return null;
    return students.find((s) => (s.id || s._id) === id) || null;
  }, [students, selectedStudentId]);

  const handleSelectExam = (id) => {
    setSelectedExamId(id);
    setMarks({});
  };

  const setSubjectMark = (subjectId, patch) => {
    setMarks((prev) => ({
      ...prev,
      [subjectId]: { marks: '', maxMarks: 100, ...(prev[subjectId] || {}), ...patch }
    }));
  };

  const calcPreview = () => {
    if (!selectedExam) return { avg: 0, totalMarks: 0, totalMaxMarks: 0 };
    const entries = selectedExam.subjects.map((s) => {
      const v = marks[s.subject] || { marks: '', maxMarks: 100 };
      const m = v.marks === '' ? 0 : Number(v.marks);
      const mm = v.maxMarks === '' ? 100 : Number(v.maxMarks);
      return { marks: Number.isFinite(m) ? m : 0, maxMarks: Number.isFinite(mm) && mm > 0 ? mm : 100 };
    });
    const totalMaxMarks = entries.reduce((sum, e) => sum + e.maxMarks, 0);
    const totalMarks = entries.reduce((sum, e) => sum + e.marks, 0);
    const avg = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
    return { avg, totalMarks, totalMaxMarks };
  };

  const handleSave = async () => {
    if (!selectedExam || !selectedStudentId) return;

    const payloadMarks = selectedExam.subjects
      .map((s) => {
        const v = marks[s.subject];
        if (!v || v.marks === '' || v.marks === null || v.marks === undefined) return null;
        const m = Number(v.marks);
        const mm = v.maxMarks === '' || v.maxMarks === null || v.maxMarks === undefined ? 100 : Number(v.maxMarks);
        return {
          subjectId: s.subject,
          marks: m,
          maxMarks: mm
        };
      })
      .filter(Boolean);

    if (payloadMarks.length === 0) {
      toast.warning('Enter at least one subject mark');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/exams/${selectedExam._id}/marks`, {
        studentId: selectedStudentId,
        marks: payloadMarks
      });
      toast.success('Marks saved');
      setShowPreview(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Marks"
        subtitle="Enter exam marks for your students"
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Marks' }]}
      />

      {exams.length === 0 ? (
        <EmptyState icon="📝" title="No exams found" subtitle="Ask HOD to create an exam first" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-6 lg:col-span-1">
            <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Select Exam</h3>
            <div className="space-y-2">
              {exams.map((exam) => {
                const active = exam._id === selectedExamId;
                return (
                  <button
                    key={exam._id}
                    type="button"
                    onClick={() => handleSelectExam(exam._id)}
                    className={`w-full text-left p-3 rounded-xl border transition ${active ? 'bg-indigo-500/15 border-indigo-500/40' : 'bg-[var(--bg-base)] border-[var(--border)] hover:border-indigo-500/30'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{exam.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(exam.date)} · {exam.subjects?.length || 0} subjects</p>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-indigo-400' : 'bg-[var(--border)]'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-6 lg:col-span-2">
            {!selectedExam ? (
              <EmptyState icon="🧾" title="Pick an exam" subtitle="Select an exam to enter marks" />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedExam.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{formatDateTime(selectedExam.date)}</p>
                  </div>
                  <div className="min-w-[260px]">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Student</label>
                    <select className="input" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                      <option value="">Select student</option>
                      {students.map((s) => (
                        <option key={s.id || s._id} value={s.id || s._id}>
                          {s.rollNumber ? `${s.rollNumber} - ${s.name}` : s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedExam.subjects.length === 0 ? (
                  <EmptyState icon="📚" title="No subjects" subtitle="This exam has no subjects configured" />
                ) : (
                  <div className="overflow-auto rounded-xl border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead style={{ background: 'var(--bg-base)' }}>
                        <tr>
                          <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Subject</th>
                          <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Code</th>
                          <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Marks</th>
                          <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedExam.subjects.map((s) => {
                          const v = marks[s.subject] || { marks: '', maxMarks: 100 };
                          return (
                            <tr key={s.subject} className="border-t" style={{ borderColor: 'var(--border)' }}>
                              <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</td>
                              <td className="px-4 py-3 text-[var(--text-secondary)]">{s.code}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  className="input"
                                  min="0"
                                  step="1"
                                  value={v.marks}
                                  onChange={(e) => setSubjectMark(s.subject, { marks: e.target.value === '' ? '' : Number(e.target.value) })}
                                  disabled={!selectedStudentId}
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  className="input"
                                  min="1"
                                  step="1"
                                  value={v.maxMarks}
                                  onChange={(e) => setSubjectMark(s.subject, { maxMarks: e.target.value === '' ? '' : Number(e.target.value) })}
                                  disabled={!selectedStudentId}
                                  placeholder="100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPreview(true)} disabled={!selectedStudentId}>
                    Preview Avg
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!selectedStudentId || saving}>
                    {saving ? 'Saving...' : 'Save Marks'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Average Preview" size="sm">
        {selectedExam && selectedStudent ? (
          (() => {
            const { avg, totalMarks, totalMaxMarks } = calcPreview();
            return (
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">{selectedStudent.name}</span>
                </p>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">Total</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{Math.round(totalMarks * 100) / 100}/{Math.round(totalMaxMarks * 100) / 100}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[var(--text-muted)]">Average</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{Math.round(avg * 100) / 100}%</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
                </div>
              </div>
            );
          })()
        ) : (
          <EmptyState icon="🧮" title="Select exam and student" subtitle="Pick an exam and student to preview average" />
        )}
      </Modal>
    </div>
  );
}

