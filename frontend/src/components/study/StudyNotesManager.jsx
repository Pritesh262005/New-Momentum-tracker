import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../common/PageHeader';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';
import { downloadPdf } from '../../utils/download';

const byName = (a, b) => (a?.name || '').localeCompare(b?.name || '');
const years = [1, 2, 3, 4];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function StudyNotesManager({ basePath, roleLabel }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState({ subjects: [], classes: [], students: [] });

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    subjectId: '',
    unitNumber: 1,
    title: '',
    body: '',
    scope: 'DEPARTMENT',
    classId: '',
    studentIds: [],
    targetYear: 1,
    targetSemester: 1,
    pdfFile: null
  });
  const [materials, setMaterials] = useState([]);

  const subject = useMemo(
    () => targets.subjects.find((s) => s._id === form.subjectId) || null,
    [targets.subjects, form.subjectId]
  );

  const fetchTargets = async () => {
    const { data } = await api.get(`${basePath}/study/targets`);
    const d = data?.success ? data.data : null;
    setTargets({
      subjects: Array.isArray(d?.subjects) ? d.subjects.slice().sort(byName) : [],
      classes: Array.isArray(d?.classes) ? d.classes.slice().sort(byName) : [],
      students: Array.isArray(d?.students) ? d.students : []
    });
    if (!form.subjectId && Array.isArray(d?.subjects) && d.subjects.length > 0) {
      setForm((prev) => ({ ...prev, subjectId: d.subjects[0]._id }));
    }
  };

  const fetchMaterials = async (subjectId) => {
    if (!subjectId) {
      setMaterials([]);
      return;
    }
    const { data } = await api.get(`${basePath}/study/materials`, { params: { subjectId } });
    setMaterials(Array.isArray(data?.data) ? data.data : []);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchTargets();
        if (form.subjectId) await fetchMaterials(form.subjectId);
      } catch (e) {
        toast.error('Failed to load subjects');
        setTargets({ subjects: [], classes: [], students: [] });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMaterials(form.subjectId).catch(() => setMaterials([]));
  }, [basePath, form.subjectId]);

  const toggleStudent = (id) => {
    setForm((prev) => {
      const set = new Set(prev.studentIds || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, studentIds: Array.from(set) };
    });
  };

  const create = async (e) => {
    e.preventDefault();
    if (!form.subjectId) return toast.warning('Select a subject');
    if (!form.title.trim()) return toast.warning('Enter title');

    try {
      setCreating(true);
      const payload = new FormData();
      payload.append('subjectId', form.subjectId);
      payload.append('unitNumber', String(form.unitNumber || 1));
      payload.append('title', form.title);
      payload.append('body', form.body);
      payload.append('scope', form.scope);
      if (form.scope === 'CLASS' && form.classId) payload.append('classId', form.classId);
      if (form.scope === 'YEAR_SEMESTER') {
        payload.append('targetYear', String(form.targetYear));
        payload.append('targetSemester', String(form.targetSemester));
      }
      if (form.scope === 'STUDENTS') {
        (form.studentIds || []).forEach((id) => payload.append('studentIds', id));
      }
      if (form.pdfFile) payload.append('pdfFile', form.pdfFile);

      await api.post(`${basePath}/study/materials`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchMaterials(form.subjectId);
      toast.success('Material shared with students');
      setShowCreate(false);
      setForm((prev) => ({
        ...prev,
        unitNumber: 1,
        title: '',
        body: '',
        classId: '',
        studentIds: [],
        targetYear: 1,
        targetSemester: 1,
        pdfFile: null
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share material');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Study Notes"
        subtitle={`Share reading material and notes with students (${roleLabel})`}
        breadcrumbs={[{ label: 'Dashboard', path: basePath }, { label: 'Study Notes' }]}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={() => { fetchTargets(); fetchMaterials(form.subjectId); }}>Refresh</button>
            <button className="btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Share Material</button>
          </div>
        }
      />

      {!targets.subjects || targets.subjects.length === 0 ? (
        <EmptyState icon="📚" title="No subjects" subtitle="Create subjects first (HOD) to share notes" />
      ) : (
        <div className="card p-6">
          <div className="text-sm text-[var(--text-muted)]">
            Select a subject, add a unit number, and upload text or PDF material. Students will see it in their Study section and get a "NEW" badge.
          </div>
        </div>
      )}

      {form.subjectId && (
        <div className="card p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Existing Materials</h3>
              <p className="text-sm text-[var(--text-muted)]">Use Unit 1 / Unit 2 PDFs later for automatic test generation.</p>
            </div>
          </div>
          {materials.length === 0 ? (
            <EmptyState icon="📄" title="No materials yet" subtitle="Upload the first unit PDF or notes for this subject" />
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <div key={material._id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{material.title}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Unit {material.unitNumber} • {material.materialType}{material.attachmentName ? ` • ${material.attachmentName}` : ''}
                    </div>
                  </div>
                  {material.hasAttachment ? (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => downloadPdf(`${basePath}/study/materials/${material._id}/file`, material.attachmentName || `unit-${material.unitNumber}.pdf`)}
                    >
                      Download PDF
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Share Subject Material" size="lg">
        <form onSubmit={create} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Subject</label>
              <select
                className="input"
                value={form.subjectId}
                onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
                required
              >
                {targets.subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                ))}
              </select>
              {subject?.description ? (
                <div className="text-xs mt-2 text-[var(--text-muted)]">{subject.description}</div>
              ) : null}
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Send To</label>
              <select
                className="input"
                value={form.scope}
                onChange={(e) => setForm((p) => ({
                  ...p,
                  scope: e.target.value,
                  classId: '',
                  studentIds: [],
                  targetYear: 1,
                  targetSemester: 1
                }))}
              >
                <option value="DEPARTMENT">All Department Students</option>
                <option value="YEAR_SEMESTER">Specific Year / Semester</option>
                <option value="CLASS">Specific Class</option>
                <option value="STUDENTS">Selected Students</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Unit Number</label>
              <input
                type="number"
                min="1"
                max="12"
                className="input"
                value={form.unitNumber}
                onChange={(e) => setForm((p) => ({ ...p, unitNumber: Number(e.target.value || 1) }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>PDF Material</label>
              <input
                type="file"
                className="input"
                accept="application/pdf"
                onChange={(e) => setForm((p) => ({ ...p, pdfFile: e.target.files?.[0] || null }))}
              />
            </div>
          </div>

          {form.scope === 'YEAR_SEMESTER' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Target Year</label>
                <select
                  className="input"
                  value={form.targetYear}
                  onChange={(e) => {
                    const targetYear = Number(e.target.value);
                    const options = semesters.filter((semester) => Math.ceil(semester / 2) === targetYear);
                    setForm((p) => ({ ...p, targetYear, targetSemester: options[0] }));
                  }}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Target Semester</label>
                <select
                  className="input"
                  value={form.targetSemester}
                  onChange={(e) => setForm((p) => ({ ...p, targetSemester: Number(e.target.value) }))}
                >
                  {semesters
                    .filter((semester) => Math.ceil(semester / 2) === Number(form.targetYear))
                    .map((semester) => (
                      <option key={semester} value={semester}>Semester {semester}</option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {form.scope === 'CLASS' && (
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Class</label>
              <select
                className="input"
                value={form.classId}
                onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}
                required
              >
                <option value="" disabled>Select class</option>
                {targets.classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              {targets.classes.length === 0 ? (
                <div className="text-xs mt-2 text-[var(--text-muted)]">No classes available for your account.</div>
              ) : null}
            </div>
          )}

          {form.scope === 'STUDENTS' && (
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Students ({form.studentIds.length} selected)
              </label>
              <div className="max-h-[220px] overflow-y-auto rounded-xl border p-3 space-y-2"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}
              >
                {targets.students.length === 0 ? (
                  <div className="text-sm text-[var(--text-muted)]">No students found.</div>
                ) : (
                  targets.students.map((s) => (
                    <label key={s._id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(form.studentIds || []).includes(s._id)}
                        onChange={() => toggleStudent(s._id)}
                      />
                      <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                      <span className="ml-auto text-xs text-[var(--text-muted)]">{s.rollNumber || ''}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Title</label>
            <input
              type="text"
              className="input"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Unit 1: Introduction"
              required
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Reading Material / Notes</label>
            <textarea
              className="input min-h-[220px] resize-none"
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="Paste notes, reading material, and key points here..."
            />
            <div className="text-xs mt-2 text-[var(--text-muted)]">
              PDF upload is optional. Add text if you want extra points for automatic question generation.
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
