import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function StudentStudy() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialDetail, setMaterialDetail] = useState(null);

  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s._id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  const selectedMaterial = useMemo(
    () => materials.find((m) => m._id === selectedMaterialId) || null,
    [materials, selectedMaterialId]
  );

  const fetchSubjects = async () => {
    const { data } = await api.get('/student/study/subjects');
    const rows = data?.success && Array.isArray(data.data) ? data.data : [];
    setSubjects(rows);
    if (!selectedSubjectId && rows.length > 0) setSelectedSubjectId(rows[0]._id);
  };

  const fetchMaterials = async (subjectId) => {
    if (!subjectId) {
      setMaterials([]);
      setSelectedMaterialId('');
      setMaterialDetail(null);
      return;
    }
    try {
      setLoadingMaterials(true);
      const { data } = await api.get(`/student/study/subjects/${subjectId}/materials`);
      const rows = data?.success && Array.isArray(data.data) ? data.data : [];
      setMaterials(rows);
      if (rows.length > 0) setSelectedMaterialId(rows[0]._id);
      else setSelectedMaterialId('');
    } catch (e) {
      toast.error('Failed to load subject materials');
      setMaterials([]);
      setSelectedMaterialId('');
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchMaterialDetail = async (materialId) => {
    if (!materialId) {
      setMaterialDetail(null);
      return;
    }
    try {
      const { data } = await api.get(`/student/study/materials/${materialId}`);
      const row = data?.success ? data.data : null;
      setMaterialDetail(row);
      await api.post(`/student/study/materials/${materialId}/read`);
      setMaterials((prev) => prev.map((m) => (m._id === materialId ? { ...m, unread: false } : m)));
      setSubjects((prev) =>
        prev.map((s) =>
          s._id === selectedSubjectId ? { ...s, unreadCount: Math.max(0, (s.unreadCount || 0) - 1) } : s
        )
      );
    } catch (e) {
      setMaterialDetail(null);
      toast.error('Failed to load material');
    }
  };

  const fetchNote = async ({ subjectId, materialId }) => {
    if (!subjectId) return setNote('');
    try {
      const { data } = await api.get('/student/study/notes', {
        params: { subjectId, materialId: materialId || undefined }
      });
      setNote(data?.success ? data?.data?.content || '' : '');
    } catch {
      setNote('');
    }
  };

  const saveNote = async () => {
    if (!selectedSubjectId) return;
    try {
      setSavingNote(true);
      await api.post('/student/study/notes', {
        subjectId: selectedSubjectId,
        materialId: selectedMaterialId || null,
        content: note
      });
      toast.success('Notes saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save notes');
    } finally {
      setSavingNote(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchSubjects();
      } catch (e) {
        toast.error('Failed to load study subjects');
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMaterials(selectedSubjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  useEffect(() => {
    fetchMaterialDetail(selectedMaterialId);
    fetchNote({ subjectId: selectedSubjectId, materialId: selectedMaterialId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterialId, selectedSubjectId]);

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Study"
        subtitle="Read shared materials and take your own notes"
        breadcrumbs={[{ label: 'Dashboard', path: '/student' }, { label: 'Study' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="min-w-0">
              <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Subjects</div>
              <div className="text-xs text-[var(--text-muted)]">Your department subjects</div>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={fetchSubjects}>Refresh</button>
          </div>

          {!subjects || subjects.length === 0 ? (
            <EmptyState icon="📚" title="No subjects" subtitle="No subjects assigned yet" />
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {subjects.map((s) => {
                const active = s._id === selectedSubjectId;
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => setSelectedSubjectId(s._id)}
                    className="w-full text-left p-3 rounded-xl border transition-colors"
                    style={{
                      background: active ? 'rgba(99,102,241,0.10)' : 'var(--bg-base)',
                      borderColor: active ? 'rgba(99,102,241,0.35)' : 'var(--border)'
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                        <div className="text-xs font-mono text-[var(--text-muted)]">{s.code}</div>
                      </div>
                      {s.unreadCount > 0 && (
                        <span className="badge badge-amber">{s.unreadCount}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
              <div className="min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {selectedSubject?.name || 'Select a subject'}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {selectedSubject ? 'Reading materials shared by your teachers/HOD' : 'Choose a subject from the left'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => fetchMaterials(selectedSubjectId)}
                  disabled={!selectedSubjectId || loadingMaterials}
                >
                  Refresh
                </button>
              </div>
            </div>

            {loadingMaterials ? (
              <div className="py-10"><LoadingSpinner /></div>
            ) : !selectedSubjectId ? (
              <div className="py-10"><EmptyState icon="📘" title="No subject selected" subtitle="Pick a subject to view materials" /></div>
            ) : materials.length === 0 ? (
              <div className="py-10"><EmptyState icon="📝" title="No materials yet" subtitle="Your teachers will share notes here" /></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 pt-4 min-w-0">
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {materials.map((m) => {
                    const active = m._id === selectedMaterialId;
                    return (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => setSelectedMaterialId(m._id)}
                        className="w-full text-left p-3 rounded-xl border transition-colors"
                        style={{
                          background: active ? 'rgba(99,102,241,0.10)' : 'var(--bg-base)',
                          borderColor: active ? 'rgba(99,102,241,0.35)' : 'var(--border)'
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{m.title}</div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {m.createdBy?.name ? `By ${m.createdBy.name}` : '—'}
                            </div>
                          </div>
                          {m.unread && <span className="badge badge-amber">NEW</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="rounded-2xl border p-4 min-w-0 max-h-[520px] overflow-y-auto"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}
                >
                  {!selectedMaterialId ? (
                    <EmptyState icon="📄" title="Select material" subtitle="Choose a note to start reading" />
                  ) : !materialDetail ? (
                    <LoadingSpinner />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{materialDetail.title}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {materialDetail.createdBy?.name ? `Shared by ${materialDetail.createdBy.name}` : '-'}
                          </div>
                        </div>
                        <Avatar name={materialDetail.createdBy?.name || '-'} size="md" />
                      </div>

                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {materialDetail.body || '-'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
              <div className="min-w-0">
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>My Notes</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {selectedMaterial?.title ? `Notes for: ${selectedMaterial.title}` : 'Select material to take notes'}
                </div>
              </div>
              <button type="button" className="btn-primary btn-sm" onClick={saveNote} disabled={savingNote || !selectedSubjectId}>
                {savingNote ? 'Saving...' : 'Save'}
              </button>
            </div>

            <textarea
              className="input mt-4 min-h-[320px] resize-none"
              placeholder="Write your notes here..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!selectedSubjectId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
