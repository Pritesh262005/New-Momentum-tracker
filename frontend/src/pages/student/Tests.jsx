import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function StudentTests() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [filter, setFilter] = useState('available');

  useEffect(() => {
    fetchTests();
  }, [filter]);

  const fetchTests = async () => {
    try {
      const response = await api.get('/student/tests', { params: { status: filter } });
      const testData = response.data?.data || [];
      setTests(Array.isArray(testData) ? testData : []);
    } catch (error) {
      toast.error('Failed to load tests');
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const getTestStatus = (test) => {
    const now = new Date();
    const start = new Date(test.startTime);
    const end = new Date(start.getTime() + test.duration * 60000);
    if (now < start) return { label: 'Upcoming', color: 'amber' };
    if (now > end) return { label: 'Ended', color: 'gray' };
    return { label: 'Active', color: 'green' };
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Tests"
        subtitle="View and take tests"
        breadcrumbs={['Dashboard', 'Tests']}
      />

      <div className="card p-6 mb-6">
        <div className="flex gap-3">
          <button onClick={() => setFilter('available')} className={filter === 'available' ? 'btn-primary' : 'btn-secondary'}>Available</button>
          <button onClick={() => setFilter('completed')} className={filter === 'completed' ? 'btn-primary' : 'btn-secondary'}>Completed</button>
        </div>
      </div>

      {!tests || tests.length === 0 ? (
        <EmptyState icon="📝" title="No tests found" subtitle={`No ${filter} tests`} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests && tests.map((test) => {
            const status = getTestStatus(test);
            return (
              <div key={test._id} className="card p-6 hover:shadow-lg transition cursor-pointer" onClick={() => navigate(`/student/tests/${test._id}`)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl">
                    📝
                  </div>
                  <span className={`badge badge-${status.color}`}>{status.label}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{test.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{test.subject?.name}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>⏰</span>
                    <span>{formatDateTime(test.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>⏱️</span>
                    <span>{test.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>❓</span>
                    <span>{test.questions?.length || 0} questions</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
