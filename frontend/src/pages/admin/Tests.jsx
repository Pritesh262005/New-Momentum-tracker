import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function AdminTests() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  useEffect(() => {
    fetchTests();
  }, [pagination.page]);

  const fetchTests = async () => {
    try {
      const { data } = await api.get('/admin/tests', {
        params: { page: pagination.page, limit: pagination.limit }
      });
      setTests(Array.isArray(data) ? data : data.tests || []);
      setPagination(prev => ({ ...prev, total: data.total || 0 }));
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

  return (
    <div className="page-container">
      <PageHeader
        title="Tests"
        subtitle="View all tests"
        breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Tests' }]}
      />

      <div className="card p-6">
        <DataTable columns={columns} data={tests} loading={loading} />
        <Pagination
          currentPage={pagination.page}
          totalPages={Math.ceil(pagination.total / pagination.limit)}
          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
        />
      </div>
    </div>
  );
}
