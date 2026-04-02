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

export default function HODStudents() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    fetchStudents();
  }, [debouncedSearch]);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/hod/students', { params: { search: debouncedSearch } });
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
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base max-w-md"
          />
        </div>
        <DataTable columns={columns} data={students} onRowClick={(row) => navigate(`/hod/students/${row._id}`)} rowKey="_id" />
      </div>
    </div>
  );
}
