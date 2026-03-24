import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime, getGrade } from '../../utils/formatters';
import api from '../../api/axios';

export default function TeacherResults() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await api.get('/teacher/results');
      const list = response.data?.data || [];
      setResults(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error('Failed to load results');
      setResults([]);
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
          <Avatar name={row.student?.name} size="sm" />
          <div>
            <p className="font-semibold text-sm">{row.student?.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{row.student?.email}</p>
          </div>
        </div>
      )
    },
    { key: 'test', header: 'Test', render: (row) => row.test?.title },
    { key: 'score', header: 'Score', render: (row) => `${row.score}/${row.totalScore}` },
    { key: 'percentage', header: 'Percentage', render: (row) => `${row.percentage}%` },
    { key: 'grade', header: 'Grade', render: (row) => {
      const grade = getGrade(row.percentage);
      return <span className={`badge badge-${grade.color}`}>{grade.label}</span>;
    }},
    { key: 'submittedAt', header: 'Submitted', render: (row) => formatDateTime(row.submittedAt) }
  ];

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Results"
        subtitle="View student results"
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Results' }]}
      />

      {!results || results.length === 0 ? (
        <EmptyState icon="📊" title="No results yet" subtitle="Results will appear here once students submit tests" />
      ) : (
        <div className="card p-6">
          <DataTable columns={columns} data={results} />
        </div>
      )}
    </div>
  );
}
