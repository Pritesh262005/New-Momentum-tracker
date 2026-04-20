import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Avatar from '../../components/common/Avatar';
import MomentumRing from '../../components/common/MomentumRing';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const years = [1, 2, 3, 4];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function HODStudents() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    fetchStudents();
  }, [debouncedSearch, year, semester]);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/hod/students', { params: { search: debouncedSearch, year, semester } });
      const list = response.data?.data || [];
      setStudents(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error('Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
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
    { key: 'year', header: 'Year', render: (row) => `Year ${row.year ?? Math.ceil((row.semester ?? 1) / 2)}` },
    { key: 'semester', header: 'Semester', render: (row) => `S${row.semester ?? 1}` },
    {
      key: 'momentum',
      header: 'Momentum',
      render: (row) => (
        <div className="flex items-center gap-2">
          <MomentumRing score={row.momentum || 0} size={40} />
          <span className="font-semibold">{row.momentum || 0}</span>
        </div>
      )
    },
    { key: 'testsTaken', header: 'Tests', render: (row) => row.testsTaken || 0 },
    { key: 'avgScore', header: 'Avg Score', render: (row) => `${row.avgScore || 0}%` }
  ];

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Students"
        subtitle="Manage department students"
        breadcrumbs={[{ label: 'Dashboard', path: '/hod' }, { label: 'Students' }]}
        actions={[
          <button key="upgrade" className="btn-secondary" onClick={() => navigate('/hod/semester-upgrade')}>
            Semester Upgrade
          </button>
        ]}
      />

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base max-w-md"
          />
          <select className="input-base" value={year} onChange={(e) => { setYear(e.target.value); setSemester(''); }}>
            <option value="">All Years</option>
            {years.map((item) => <option key={item} value={item}>Year {item}</option>)}
          </select>
          <select className="input-base" value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">All Semesters</option>
            {semesters
              .filter((item) => !year || Math.ceil(item / 2) === Number(year))
              .map((item) => <option key={item} value={item}>Semester {item}</option>)}
          </select>
        </div>
        <DataTable columns={columns} data={students} onRowClick={(row) => navigate(`/hod/students/${row._id}`)} rowKey="_id" />
      </div>
    </div>
  );
}
