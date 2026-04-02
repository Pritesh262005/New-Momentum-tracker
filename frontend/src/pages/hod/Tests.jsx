import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function HODTests() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await api.get('/hod/tests');
      const list = response.data?.data || [];
      setTests(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error('Failed to load tests');
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'title', header: 'Title' },
    { key: 'subject', header: 'Subject', render: (row) => row.subject?.name },
    { key: 'teacher', header: 'Teacher', render: (row) => row.teacher?.name },
    { key: 'startTime', header: 'Start Time', render: (row) => formatDateTime(row.startTime) },
    { key: 'duration', header: 'Duration', render: (row) => `${row.duration} min` },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const now = new Date();
        const start = new Date(row.startTime);
        const end = new Date(start.getTime() + row.duration * 60000);
        if (now < start) return <span className="badge badge-amber">Upcoming</span>;
        if (now > end) return <span className="badge badge-gray">Completed</span>;
        return <span className="badge badge-green">Active</span>;
      }
    }
  ];

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Tests"
        subtitle="View department tests"
        breadcrumbs={[{ label: 'Dashboard', path: '/hod' }, { label: 'Tests' }]}
      />

      <div className="card p-6">
        <DataTable columns={columns} data={tests || []} />
      </div>
    </div>
  );
}
