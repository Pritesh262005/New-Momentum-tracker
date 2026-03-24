import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime, getGrade } from '../../utils/formatters';
import { downloadPdf } from '../../utils/download';
import api from '../../api/axios';

export default function StudentAssignments() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/assignments/student');
      setRows(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      toast.error('Failed to load assignments');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [rows]);

  const download = async (a) => {
    try {
      await downloadPdf(`/assignments/${a._id}/file`, a.assignmentFile?.fileName || 'assignment.pdf');
    } catch (e) {
      toast.error('Failed to download file');
    }
  };

  const openSubmit = (a) => {
    setSelected(a);
    setShowSubmit(true);
  };

  const openDetail = (a) => {
    setSelected(a);
    setShowDetail(true);
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Assignments"
        subtitle="Download assignments and upload your PDF submissions"
        breadcrumbs={[{ label: 'Dashboard', path: '/student' }, { label: 'Assignments' }]}
      />

      {sorted.length === 0 ? (
        <EmptyState icon="📝" title="No assignments" subtitle="Your department assignments will appear here" />
      ) : (
        <div className="space-y-4">
          {sorted.map((a) => {
            const status = a.submissionStatus || 'NOT_SUBMITTED';
            const badge =
              status === 'GRADED' ? { text: 'Graded', cls: 'bg-green-100 text-green-800' } :
              status === 'RETURNED' ? { text: 'Returned', cls: 'bg-amber-100 text-amber-900' } :
              status === 'SUBMITTED' ? { text: 'Submitted', cls: 'bg-cyan-100 text-cyan-900' } :
              { text: 'Not submitted', cls: 'bg-gray-100 text-gray-800' };

            const grade = a.grade?.percentage !== undefined ? getGrade(a.grade.percentage) : null;

            return (
              <div key={a._id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{a.title}</h3>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">{a.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
                      <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">{a.subject}</span>
                      <span className="px-2 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)]">Due {formatDateTime(a.dueDate)}</span>
                      <span className={`px-2 py-1 rounded-full ${badge.cls}`}>{badge.text}</span>
                      {a.grade && (
                        <span className={`px-2 py-1 rounded-full badge badge-${grade?.color || 'gray'}`}>
                          {a.grade.percentage?.toFixed ? a.grade.percentage.toFixed(2) : a.grade.percentage}% ({grade?.label})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {a.assignmentFile?.filePath && <button className="btn-secondary" onClick={() => download(a)}>Download</button>}
                    <button className="btn-secondary" onClick={() => openDetail(a)}>Details</button>
                    {status === 'NOT_SUBMITTED' && <button className="btn-primary" onClick={() => openSubmit(a)}>Submit</button>}
                    {status === 'RETURNED' && <button className="btn-primary" onClick={() => openSubmit(a)}>Resubmit</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showSubmit && selected && (
        <SubmitModal
          assignment={selected}
          onClose={() => setShowSubmit(false)}
          onSuccess={async () => {
            setShowSubmit(false);
            await fetchAssignments();
          }}
        />
      )}

      {showDetail && selected && (
        <DetailModal
          assignment={selected}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}

function SubmitModal({ assignment, onClose, onSuccess }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.warning('Select a PDF file');

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('submissionFile', file);

      if (assignment.submissionStatus === 'RETURNED') {
        await api.put(`/assignments/${assignment._id}/resubmit`, fd);
        toast.success('Resubmitted');
      } else {
        await api.post(`/assignments/${assignment._id}/submit`, fd);
        toast.success('Submitted');
      }

      await onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Upload Submission (PDF)" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="form-group">
          <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">PDF File</label>
          <input type="file" accept="application/pdf" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Uploading...' : 'Upload'}</button>
        </div>
      </form>
    </Modal>
  );
}

function DetailModal({ assignment, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/assignments/${assignment._id}/my-submission`);
        setSubmission(data?.success ? data.data : null);
      } catch (e) {
        setSubmission(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment?._id]);

  const downloadSubmission = async () => {
    try {
      if (!submission?._id) return;
      await downloadPdf(`/assignments/submissions/${submission._id}/file`, submission.submissionFile?.fileName || 'submission.pdf');
    } catch (e) {
      toast.error('Failed to download submission');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Assignment Details" size="lg">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{assignment.title}</div>
            <div className="text-xs mt-1 text-[var(--text-muted)]">Due {formatDateTime(assignment.dueDate)}</div>
            {assignment.instructions && (
              <div className="text-sm mt-3 text-[var(--text-secondary)] whitespace-pre-wrap">{assignment.instructions}</div>
            )}
          </div>

          {!submission ? (
            <EmptyState icon="📭" title="No submission yet" subtitle="Upload your PDF to submit" />
          ) : (
            <div className="card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Your Submission</div>
                <button className="btn-secondary btn-sm" onClick={downloadSubmission}>PDF</button>
              </div>
              <div className="text-xs text-[var(--text-muted)]">Status: {submission.status}</div>
              {submission.status === 'GRADED' && (
                <div className="text-sm text-[var(--text-secondary)]">
                  Score: <span className="font-semibold text-[var(--text-primary)]">{submission.finalGrade}/{submission.assignment?.totalMarks}</span>
                </div>
              )}
              {submission.feedback && (
                <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">Feedback: {submission.feedback}</div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
