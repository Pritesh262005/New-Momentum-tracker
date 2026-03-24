import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import MomentumRing from '../../components/common/MomentumRing';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/student/dashboard');
      const dashData = response.data?.data || {};
      setData(dashData);
    } catch (error) {
      showToast('Failed to load dashboard', 'error');
      setData({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;
  if (!data) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader title="Dashboard" subtitle="Welcome back!" breadcrumbs={[{ label: 'Dashboard' }]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 flex flex-col items-center">
          <MomentumRing score={data?.momentum || 0} size={120} />
          <h3 className="text-2xl font-bold mt-4">{data?.momentum || 0}</h3>
          <p className="text-sm text-[var(--text-secondary)]">Momentum Score</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="font-bold">{data?.streak || 0} Day Streak</span>
          </div>
        </div>

        <StatCard title="Tests Taken" value={data?.testsTaken || 0} icon="📝" color="indigo" />
        <StatCard title="Avg Score" value={`${data?.avgScore || 0}%`} icon="📊" color="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Upcoming Tests</h3>
          <div className="space-y-3">
            {data?.upcomingTests && data.upcomingTests.map((test) => (
              <div key={test._id} className="p-4 rounded-lg bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] cursor-pointer transition" onClick={() => navigate(`/student/tests/${test._id}`)}>
                <h4 className="font-semibold mb-1">{test.title}</h4>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{test.subject?.name}</p>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span>⏰ {formatDateTime(test.startTime)}</span>
                  <span>⏱️ {test.duration} min</span>
                </div>
              </div>
            )) || <p className="text-sm text-[var(--text-secondary)]">No upcoming tests</p>}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Recent Results</h3>
          <div className="space-y-3">
            {data?.recentResults && data.recentResults.map((result) => (
              <div key={result._id} className="p-4 rounded-lg bg-[var(--bg-base)]">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{result.test?.title}</h4>
                  <span className="font-bold text-[var(--primary)]">{result.percentage}%</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{formatDateTime(result.submittedAt)}</p>
              </div>
            )) || <p className="text-sm text-[var(--text-secondary)]">No results yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
