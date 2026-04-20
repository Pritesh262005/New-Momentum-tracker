import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';
import { downloadPdf } from '../../utils/download';

export default function StudentStudy() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ year: '', semester: '' });
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
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
    try {
      setLoading(true);
      const { data } = await api.get('/student/study/subjects', { params: filters });
      const rows = data?.success && Array.isArray(data.data) ? data.data : [];
      setSubjects(rows);
      if (rows.length > 0 && !rows.find(s => s._id === selectedSubjectId)) {
        setSelectedSubjectId(rows[0]._id);
      } else if (rows.length === 0) {
        setSelectedSubjectId('');
      }
    } catch (e) {
      toast.error('Failed to load study subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async (subjectId) => {
    if (!subjectId) {
      setMaterials([]);
      setSelectedMaterialId('');
      setMaterialDetail(null);
      return;
    }
    const { data } = await api.get(`/student/study/subjects/${subjectId}/materials`);
    const rows = data?.success && Array.isArray(data.data) ? data.data : [];
    setMaterials(rows);
    setSelectedMaterialId(rows[0]?._id || '');
  };

  const fetchMaterialDetail = async (materialId) => {
    if (!materialId) {
      setMaterialDetail(null);
      return;
    }
    const { data } = await api.get(`/student/study/materials/${materialId}`);
    const row = data?.success ? data.data : null;
    setMaterialDetail(row);
    await api.post(`/student/study/materials/${materialId}/read`);
    setMaterials((prev) => prev.map((m) => (m._id === materialId ? { ...m, unread: false } : m)));
  };

  const fetchNote = async (subjectId, materialId) => {
    if (!subjectId) return setNote('');
    const { data } = await api.get('/student/study/notes', {
      params: { subjectId, materialId: materialId || undefined }
    });
    setNote(data?.success ? data?.data?.content || '' : '');
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
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save notes');
    } finally {
      setSavingNote(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [filters.year, filters.semester]);

  useEffect(() => {
    fetchMaterials(selectedSubjectId).catch(() => {
      toast.error('Failed to load subject materials');
      setMaterials([]);
      setSelectedMaterialId('');
    });
  }, [selectedSubjectId]);

  useEffect(() => {
    fetchMaterialDetail(selectedMaterialId).catch(() => {
      toast.error('Failed to load material');
      setMaterialDetail(null);
    });
    fetchNote(selectedSubjectId, selectedMaterialId).catch(() => setNote(''));
  }, [selectedSubjectId, selectedMaterialId]);

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Study"
        subtitle="Read unit materials, download PDFs, and take your own notes"
        breadcrumbs={[{ label: 'Dashboard', path: '/student' }, { label: 'Study' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Subjects</div>
              <div className="text-xs text-[var(--text-muted)]">Your department subjects</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
             <select
               className="input-base text-xs py-1"
               value={filters.year}
               onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value, semester: '' }))}
             >
               <option value="">Current Year</option>
               {[1,2,3,4].map((year) => (
                 <option key={year} value={year}>Year {year}</option>
               ))}
             </select>
             <select
               className="input-base text-xs py-1"
               value={filters.semester}
               onChange={(e) => setFilters((prev) => ({ ...prev, semester: e.target.value }))}
             >
               <option value="">All Semesters</option>
               {[1,2,3,4,5,6,7,8]
                 .filter((sem) => !filters.year || Math.ceil(sem / 2) === Number(filters.year))
                 .map((sem) => (
                   <option key={sem} value={sem}>Semester {sem}</option>
                 ))}
             </select>
          </div>

          {subjects.length === 0 ? (
            <EmptyState icon="📚" title="No subjects" subtitle="No subjects assigned yet" />
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {subjects.map((subject) => {
                const active = subject._id === selectedSubjectId;
                return (
                  <button
                    key={subject._id}
                    type="button"
                    onClick={() => setSelectedSubjectId(subject._id)}
                    className="w-full text-left p-3 rounded-xl border transition-colors"
                    style={{
                      background: active ? 'rgba(99,102,241,0.10)' : 'var(--bg-base)',
                      borderColor: active ? 'rgba(99,102,241,0.35)' : 'var(--border)'
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{subject.name}</div>
                        <div className="text-xs font-mono text-[var(--text-muted)] flex items-center justify-between">
                          <span>{subject.code}</span>
                          <span className="text-[10px] ml-2 text-gray-400">Y{subject.year}-S{subject.semester}</span>
                        </div>
                      </div>
                      {subject.unreadCount > 0 ? <span className="badge badge-amber">{subject.unreadCount}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedSubject?.name || 'Select a subject'}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {selectedSubject ? 'Unit-wise material shared by your teachers / HOD' : 'Choose a subject from the left'}
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => fetchMaterials(selectedSubjectId)}
                disabled={!selectedSubjectId}
              >
                Refresh
              </button>
            </div>

            {!selectedSubjectId ? (
              <div className="py-10"><EmptyState icon="📘" title="No subject selected" subtitle="Pick a subject to view materials" /></div>
            ) : materials.length === 0 ? (
              <div className="py-10"><EmptyState icon="📝" title="No materials yet" subtitle="Your teachers will share notes and PDFs here" /></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 pt-4">
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {materials.map((material) => {
                    const active = material._id === selectedMaterialId;
                    return (
                      <button
                        key={material._id}
                        type="button"
                        onClick={() => setSelectedMaterialId(material._id)}
                        className="w-full text-left p-3 rounded-xl border transition-colors"
                        style={{
                          background: active ? 'rgba(99,102,241,0.10)' : 'var(--bg-base)',
                          borderColor: active ? 'rgba(99,102,241,0.35)' : 'var(--border)'
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{material.title}</div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {`Unit ${material.unitNumber || 1}`}{material.attachmentName ? ` • ${material.attachmentName}` : ''}
                            </div>
                          </div>
                          {material.unread ? <span className="badge badge-amber">NEW</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border p-4 max-h-[520px] overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
                  {!selectedMaterialId ? (
                    <EmptyState icon="📄" title="Select material" subtitle="Choose a note to start reading" />
                  ) : !materialDetail ? (
                    <LoadingSpinner />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{materialDetail.title}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {`Unit ${materialDetail.unitNumber || 1}`}{materialDetail.createdBy?.name ? ` • Shared by ${materialDetail.createdBy.name}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {materialDetail.hasAttachment ? (
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => downloadPdf(`/student/study/materials/${materialDetail._id}/file`, materialDetail.attachmentName || `${materialDetail.title}.pdf`)}
                            >
                              Download PDF
                            </button>
                          ) : null}
                          <Avatar name={materialDetail.createdBy?.name || '-'} size="md" />
                        </div>
                      </div>

                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {materialDetail.body || 'No text notes added. Use the PDF for this unit material.'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
              <div>
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
