import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ConfirmModal from '../../components/common/ConfirmModal';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function TeacherTests() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await api.get('/teacher/tests');
      const testList = response.data?.data || [];
      setTests(Array.isArray(testList) ? testList : []);
    } catch (error) {
      toast.error('Failed to load tests');
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/teacher/tests/${selected._id}`);
      toast.success('Test deleted');
      setShowDelete(false);
      fetchTests();
    } catch (error) {
      toast.error('Failed to delete test');
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
        subtitle="Manage your tests"
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Tests' }]}
        actions={<button onClick={() => navigate('/teacher/tests/create')} className="btn-primary">+ Create Test</button>}
      />

      {!tests || tests.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No tests yet"
          subtitle="Create your first test"
          action={
            <button onClick={() => navigate('/teacher/tests/create')} className="btn btn-primary">
              Create Test
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests && tests.map((test) => {
            const status = getTestStatus(test);
            return (
              <div key={test._id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl">
                    📝
                  </div>
                  <span className={`badge badge-${status.color}`}>{status.label}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{test.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{test.subject?.name}</p>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>⏰</span>
                    <span>{formatDateTime(test.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>👥</span>
                    <span>{test.submissions || 0} submissions</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/teacher/results?test=${test._id}`)} className="btn btn-secondary btn-sm flex-1">View Results</button>
                  <button onClick={() => { setSelected(test); setShowDelete(true); }} className="btn btn-danger btn-sm">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Test"
          message={`Delete ${selected?.title}?`}
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
