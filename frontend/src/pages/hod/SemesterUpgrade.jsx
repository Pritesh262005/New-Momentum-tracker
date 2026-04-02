import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Avatar from '../../components/common/Avatar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api/axios';

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function SemesterUpgrade() {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(() => new Set());

  const [fromSemester, setFromSemester] = useState(1);
  const [toSemester, setToSemester] = useState(2);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const canPromote = useMemo(() => Number.isInteger(fromSemester) && Number.isInteger(toSemester) && fromSemester !== toSemester, [fromSemester, toSemester]);

  useEffect(() => {
    const next = Math.min(8, (Number(fromSemester) || 1) + 1);
    if (toSemester === fromSemester) setToSemester(next);
  }, [fromSemester]);

  useEffect(() => {
    fetchStudents();
  }, [fromSemester, debouncedSearch]);

  const fetchStudents = async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const res = await api.get('/hod/students', {
        params: { semester: fromSemester, search: debouncedSearch }
      });
      const list = res.data?.data || [];
      setStudents(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const onToggleRow = (row, checked) => {
    const id = row?._id;
    if (!id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const onToggleAll = (checked) => {
    if (!checked) return setSelected(new Set());
    const all = new Set((students || []).map((s) => s._id).filter(Boolean));
    setSelected(all);
  };

  const promote = async ({ promoteAll }) => {
    if (!canPromote) {
      toast.error('Select different From/To semester');
      return;
    }

    if (!promoteAll && selected.size === 0) {
      toast.error('Select at least one student');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        fromSemester,
        toSemester,
        studentIds: promoteAll ? undefined : Array.from(selected)
      };
      const res = await api.post('/hod/semester/promote', body);
      const promoted = res.data?.data?.promoted ?? 0;
      toast.success(`Promoted ${promoted} student(s) to S${toSemester}`);
      await fetchStudents();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Promotion failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-semibold text-sm">{row.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'rollNumber', header: 'Roll No', render: (row) => row.rollNumber || '-' },
    { key: 'semester', header: 'Semester', render: (row) => `S${row.semester ?? 1}` },
    { key: 'momentum', header: 'Momentum', render: (row) => row.momentum ?? 0 },
    { key: 'avgScore', header: 'MCQ Avg', render: (row) => `${row.avgScore ?? 0}%` }
  ];

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Semester Upgrade"
        subtitle="Promote students semester-by-semester (S1 → S2, S2 → S3, etc.)"
        breadcrumbs={[{ label: 'Dashboard', path: '/hod' }, { label: 'Semester Upgrade' }]}
        actions={[
          <button key="back" className="btn-secondary" onClick={() => navigate('/hod/students')}>Back to Students</button>
        ]}
      />

      <div className="card p-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>From</label>
              <select
                className="input-base w-[140px]"
                value={fromSemester}
                onChange={(e) => setFromSemester(Number(e.target.value))}
              >
                {semesters.map((s) => <option key={s} value={s}>{`S${s}`}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>To</label>
              <select
                className="input-base w-[140px]"
                value={toSemester}
                onChange={(e) => setToSemester(Number(e.target.value))}
              >
                {semesters.map((s) => <option key={s} value={s}>{`S${s}`}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Search</label>
              <input
                className="input-base w-[280px]"
                placeholder="Search by name / roll / email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" disabled={submitting} onClick={() => setSelected(new Set())}>
              Clear Selection
            </button>
            <button className="btn-secondary" disabled={submitting || !canPromote} onClick={() => promote({ promoteAll: true })}>
              Promote All
            </button>
            <button className="btn btn-primary" disabled={submitting || !canPromote || selected.size === 0} onClick={() => promote({ promoteAll: false })}>
              Promote Selected ({selected.size})
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={students}
          rowKey="_id"
          selectable
          selectedRowIds={selected}
          onToggleRow={onToggleRow}
          onToggleAll={onToggleAll}
        />
      </div>
    </div>
  );
}

