import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import { downloadFile, downloadPdf } from '../../utils/download';
import api from '../../api/axios';

const years = [1, 2, 3, 4];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TeacherAssignments() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/assignments/my-assignments');
      setRows(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      toast.error('Failed to load assignments');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/assignments/${selected._id}`);
      toast.success('Assignment deleted');
      setShowDelete(false);
      setSelected(null);
      await fetchAssignments();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const handlePublish = async (a) => {
    try {
      await api.patch(`/assignments/${a._id}/publish`);
      toast.success('Assignment published');
      await fetchAssignments();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to publish assignment');
    }
  };

  const handleDownload = async (a) => {
    try {
      await downloadPdf(`/assignments/${a._id}/file`, a.assignmentFile?.fileName || 'assignment.pdf');
    } catch (e) {
      toast.error('Failed to download file');
    }
  };

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rows]);

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Assignments"
        subtitle="Send PDF assignments to your department students"
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Assignments' }]}
        actions={<button className="btn-primary" onClick={() => { setSelected(null); setShowModal(true); }}>+ Create Assignment</button>}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No assignments yet"
          subtitle="Create your first PDF assignment"
          action={<button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Assignment</button>}
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((a) => (
            <div key={a._id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{a.title}</h3>
                  <p className="text-sm mt-1 text-[var(--text-secondary)]">{a.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
                    <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">{a.subject}</span>
                    {a.targetYear && a.targetSemester ? (
                      <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">
                        Year {a.targetYear} / Sem {a.targetSemester}
                      </span>
                    ) : null}
                    <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">Due {formatDateTime(a.dueDate)}</span>
                    <span className={`badge ${a.isPublished ? 'badge-green' : 'badge-amber'}`}>
                      {a.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">
                      {a.submissionCount || 0} submissions
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {a.assignmentFile?.filePath && (
                    <button className="btn-secondary" onClick={() => handleDownload(a)}>Download</button>
                  )}
                  <button className="btn-secondary" onClick={() => { setSelected(a); setShowSubmissions(true); }}>Submissions</button>
                  {!a.isPublished && <button className="btn-primary" onClick={() => handlePublish(a)}>Publish</button>}
                  <button className="btn-danger" onClick={() => { setSelected(a); setShowDelete(true); }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AssignmentModal
          assignment={selected}
          onClose={() => setShowModal(false)}
          onSuccess={fetchAssignments}
        />
      )}

      {showDelete && (
        <ConfirmModal
          isOpen={showDelete}
          title="Delete Assignment"
          message={`Delete ${selected?.title}?`}
          variant="danger"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {showSubmissions && selected && (
        <SubmissionsModal
          assignment={selected}
          onClose={() => setShowSubmissions(false)}
        />
      )}
    </div>
  );
}

function AssignmentModal({ assignment, onClose, onSuccess }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [publishNow, setPublishNow] = useState(true);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    subject: assignment?.subject || '',
    targetYear: assignment?.targetYear || 1,
    targetSemester: assignment?.targetSemester || 1,
    submissionType: assignment?.submissionType || 'PDF',
    codeFunctionName: assignment?.codeSpec?.functionName || 'solve',
    codeTimeoutMs: assignment?.codeSpec?.timeoutMs || 3000,
    codeSpecTests: assignment?.codeSpec?.tests ? JSON.stringify(assignment.codeSpec.tests, null, 2) : '[]',
    dueDate: assignment?.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '',
    totalMarks: assignment?.totalMarks || 100,
    instructions: assignment?.instructions || '',
    allowLateSubmission: assignment?.allowLateSubmission ?? false,
    latePenaltyPercent: assignment?.latePenaltyPercent ?? 0
  });
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/teacher/subjects', {
          params: { year: form.targetYear, semester: form.targetSemester }
        });
        const list = data?.success ? data.data : (data?.subjects || []);
        setSubjects(Array.isArray(list) ? list : []);
      } catch (e) {
        setSubjects([]);
      }
    })();
  }, [form.targetYear, form.targetSemester]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('subject', form.subject);
      fd.append('targetYear', String(form.targetYear));
      fd.append('targetSemester', String(form.targetSemester));
      fd.append('submissionType', form.submissionType || 'PDF');
      if ((form.submissionType || 'PDF') === 'CODE_JS') {
        fd.append('codeFunctionName', form.codeFunctionName || 'solve');
        fd.append('codeTimeoutMs', String(form.codeTimeoutMs || 3000));
        fd.append('codeSpecTests', form.codeSpecTests || '[]');
      }
      fd.append('dueDate', new Date(form.dueDate).toISOString());
      fd.append('totalMarks', String(form.totalMarks));
      fd.append('instructions', form.instructions);
      fd.append('allowLateSubmission', String(!!form.allowLateSubmission));
      fd.append('latePenaltyPercent', String(form.latePenaltyPercent || 0));
      if (file) fd.append('assignmentFile', file);

      const { data } = await api.post('/assignments', fd);
      const created = data?.data;
      if (publishNow && created?._id) {
        await api.patch(`/assignments/${created._id}/publish`);
      }

      toast.success('Assignment created');
      await onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Assignment" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="form-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Title</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="form-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Description</label>
          <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Subject</label>
            <select
              className="input"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Target Year</label>
            <select
              className="input"
              value={form.targetYear}
              onChange={(e) => {
                const targetYear = Number(e.target.value);
                const options = semesters.filter((semester) => Math.ceil(semester / 2) === targetYear);
                setForm({ ...form, targetYear, targetSemester: options[0] });
              }}
            >
              {years.map((year) => <option key={year} value={year}>{`Year ${year}`}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Target Semester</label>
            <select
              className="input"
              value={form.targetSemester}
              onChange={(e) => setForm({ ...form, targetSemester: Number(e.target.value) })}
            >
              {semesters.filter((semester) => Math.ceil(semester / 2) === Number(form.targetYear)).map((semester) => (
                <option key={semester} value={semester}>{`Semester ${semester}`}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Due Date</label>
            <input type="datetime-local" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Total Marks</label>
            <input type="number" className="input" min="1" max="100" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: Number(e.target.value) })} required />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>PDF File (Optional)</label>
            <input type="file" accept="application/pdf" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <p className="text-xs mt-1 text-[var(--text-muted)]">You can create an assignment with only instructions.</p>
          </div>
        </div>
        <div className="form-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Submission Type</label>
          <select className="input" value={form.submissionType} onChange={(e) => setForm({ ...form, submissionType: e.target.value })}>
            <option value="PDF">PDF</option>
            <option value="CODE_JS">Code (.js)</option>
          </select>
          <p className="text-xs mt-1 text-[var(--text-muted)]">Code submissions require server autograde to be enabled.</p>
        </div>

        {form.submissionType === 'CODE_JS' && (
          <div className="card p-4 border border-[var(--border)] bg-[var(--bg-base)]">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Code Autograde Setup</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Function Name</label>
                <input className="input" value={form.codeFunctionName} onChange={(e) => setForm({ ...form, codeFunctionName: e.target.value })} />
                <p className="text-xs mt-1 text-[var(--text-muted)]">
                  Students export <span className="font-mono">{`module.exports.${form.codeFunctionName || 'solve'} = (input) => output`}</span>.
                </p>
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Timeout (ms)</label>
                <input type="number" className="input" min="500" max="15000" value={form.codeTimeoutMs} onChange={(e) => setForm({ ...form, codeTimeoutMs: Number(e.target.value) })} />
              </div>
            </div>
            <div className="form-group mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Tests (JSON Array)</label>
              <textarea className="input font-mono text-xs" rows={8} value={form.codeSpecTests} onChange={(e) => setForm({ ...form, codeSpecTests: e.target.value })} />
              <p className="text-xs mt-1 text-[var(--text-muted)]">
                Example: <span className="font-mono">{`[{"input":"2\\n3\\n","expected":"5"}]`}</span>
              </p>
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Instructions (Optional)</label>
          <textarea className="input" rows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" checked={form.allowLateSubmission} onChange={(e) => setForm({ ...form, allowLateSubmission: e.target.checked })} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Allow late submission</span>
            </label>
            {form.allowLateSubmission && (
              <div className="mt-2">
                <label className="block text-xs font-medium mb-1 text-[var(--text-muted)]">Late penalty (%)</label>
                <input type="number" className="input" min="0" max="100" value={form.latePenaltyPercent} onChange={(e) => setForm({ ...form, latePenaltyPercent: Number(e.target.value) })} />
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Publish immediately</span>
            </label>
            <p className="text-xs mt-1 text-[var(--text-muted)]">Published assignments appear to students.</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

function SubmissionsModal({ assignment, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [gradeTarget, setGradeTarget] = useState(null);
  const [plagLoading, setPlagLoading] = useState(false);
  const [plagReport, setPlagReport] = useState(null);
  const [showMatchesFor, setShowMatchesFor] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/assignments/${assignment._id}/submissions`);
        setSubmissions(data?.success && Array.isArray(data.data) ? data.data : []);
      } catch (e) {
        toast.error('Failed to load submissions');
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment?._id]);

  const runPlagiarism = async () => {
    try {
      setPlagLoading(true);
      const { data } = await api.get(`/assignments/${assignment._id}/plagiarism`);
      setPlagReport(data?.success ? data.data : null);
      const { data: subs } = await api.get(`/assignments/${assignment._id}/submissions`);
      setSubmissions(subs?.success && Array.isArray(subs.data) ? subs.data : []);
      toast.success('Plagiarism check complete');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to run plagiarism check');
      setPlagReport(null);
    } finally {
      setPlagLoading(false);
    }
  };

  const downloadSubmission = async (s) => {
    try {
      const name = s.submissionFile?.fileName || 'submission';
      if (String(name).toLowerCase().endsWith('.pdf')) {
        await downloadPdf(`/assignments/submissions/${s._id}/file`, name);
      } else {
        await downloadFile(`/assignments/submissions/${s._id}/file`, name, 'text/plain');
      }
    } catch (e) {
      toast.error('Failed to download submission');
    }
  };

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Submissions" size="lg">
        <LoadingSpinner />
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`Submissions • ${assignment.title}`} size="lg" noPad>
      <div className="p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)]">
            {plagReport?.checkedAt ? `Plagiarism checked: ${formatDateTime(plagReport.checkedAt)}` : 'Plagiarism not checked yet'}
          </div>
          <button className="btn-secondary btn-sm" disabled={plagLoading} onClick={runPlagiarism}>
            {plagLoading ? 'Checking...' : 'Run Plagiarism Check'}
          </button>
        </div>

        {submissions.length === 0 ? (
          <EmptyState icon="📭" title="No submissions yet" subtitle="Students submissions will appear here" />
        ) : (
          submissions.map((s) => (
            <div key={s._id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{s.student?.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{s.student?.rollNumber || '-'}</div>
                  <div className="text-xs mt-1 text-[var(--text-muted)]">{s.isLate ? `Late by ${s.lateByHours || 0}h` : 'On time'}</div>
                  {s.plagiarism?.checkedAt && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`badge badge-${s.plagiarism.suspicious ? 'red' : 'green'}`}>
                        Similarity {Math.round((s.plagiarism.topSimilarity || 0) * 100)}%
                      </span>
                      {(s.plagiarism.matches || []).length > 0 && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setShowMatchesFor(s)}>
                          View matches
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => downloadSubmission(s)}>{String(s.submissionFile?.fileName || '').toLowerCase().endsWith('.js') ? 'File' : 'PDF'}</button>
                  <button className="btn-primary btn-sm" onClick={() => setGradeTarget(s)}>
                    {s.status === 'GRADED' ? 'Update Grade' : 'Grade'}
                  </button>
                </div>
              </div>
              {s.autoGrade?.status && s.autoGrade.status !== 'NOT_RUN' && (
                <div className="mt-3 text-sm text-[var(--text-secondary)]">
                  Auto grade: <span className="font-semibold text-[var(--text-primary)]">{s.autoGrade.percentage ?? 0}%</span> ({s.autoGrade.summary || s.autoGrade.status})
                </div>
              )}
              {s.status === 'GRADED' && (
                <div className="mt-3 text-sm text-[var(--text-secondary)]">
                  Score: <span className="font-semibold text-[var(--text-primary)]">{s.finalGrade}/{assignment.totalMarks}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {gradeTarget && (
        <GradeModal
          submission={gradeTarget}
          totalMarks={assignment.totalMarks}
          onClose={() => setGradeTarget(null)}
          onSaved={async () => {
            setGradeTarget(null);
            setLoading(true);
            try {
              const { data } = await api.get(`/assignments/${assignment._id}/submissions`);
              setSubmissions(data?.success && Array.isArray(data.data) ? data.data : []);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {showMatchesFor && (
        <Modal
          isOpen={true}
          onClose={() => setShowMatchesFor(null)}
          title={`Plagiarism Matches • ${showMatchesFor.student?.name || 'Student'}`}
          size="md"
        >
          <div className="space-y-3">
            <div className="text-xs text-[var(--text-muted)]">
              Threshold: {Math.round(((showMatchesFor.plagiarism?.threshold || 0.78) * 100))}%
            </div>
            {(showMatchesFor.plagiarism?.matches || []).length === 0 ? (
              <EmptyState icon="✅" title="No matches" subtitle="No strong similarity found" />
            ) : (
              <div className="space-y-2">
                {(showMatchesFor.plagiarism.matches || []).map((m) => (
                  <div key={String(m.submission || m.student || m.studentName)} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{m.studentName || 'Student'}</div>
                      <span className="badge badge-amber">{Math.round((m.similarity || 0) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function GradeModal({ submission, totalMarks, onClose, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [grade, setGrade] = useState(submission.grade ?? submission.finalGrade ?? 0);
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [returnForRevision, setReturnForRevision] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put(`/assignments/submissions/${submission._id}/grade`, {
        grade: Number(grade),
        feedback,
        returnForRevision
      });
      toast.success(returnForRevision ? 'Returned for revision' : 'Graded');
      await onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Grade Submission" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="form-group">
          <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Score</label>
          <input type="number" className="input" min="0" max={totalMarks} value={grade} onChange={(e) => setGrade(e.target.value)} required />
          <p className="text-xs mt-1 text-[var(--text-muted)]">Out of {totalMarks}</p>
        </div>
        <div className="form-group">
          <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Feedback (Optional)</label>
          <textarea className="input" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded" checked={returnForRevision} onChange={(e) => setReturnForRevision(e.target.checked)} />
          <span className="text-sm text-[var(--text-primary)]">Return for revision</span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
