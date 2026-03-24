import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Avatar from '../../components/common/Avatar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api/axios';

export default function HODTeachers() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    fetchTeachers();
  }, [debouncedSearch]);

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/hod/teachers', { params: { search: debouncedSearch } });
      const list = response.data?.data || [];
      setTeachers(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error('Failed to load teachers');
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'teacher',
      label: 'Teacher',
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
    { key: 'subjects', label: 'Subjects', render: (row) => row.subjects?.length || 0 },
    { key: 'tests', label: 'Tests Created', render: (row) => row.testsCreated || 0 },
    { key: 'students', label: 'Students', render: (row) => row.studentCount || 0 }
  ];

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Teachers"
        subtitle="Manage department teachers"
        breadcrumbs={['Dashboard', 'Teachers']}
      />

      <div className="card p-6">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base max-w-md"
          />
        </div>
        <DataTable columns={columns} data={teachers || []} />
      </div>
    </div>
  );
}
