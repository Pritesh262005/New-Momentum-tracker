import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function AdminAnalytics() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get('/admin/analytics');
      setAnalytics(data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Analytics"
        subtitle="System analytics and insights"
        breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Analytics' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Tests"
          value={analytics?.totalTests || 0}
          icon="📝"
          color="indigo"
        />
        <StatCard
          title="Avg Score"
          value={`${analytics?.avgScore || 0}%`}
          icon="📊"
          color="cyan"
        />
        <StatCard
          title="Active Users"
          value={analytics?.activeUsers || 0}
          icon="👥"
          color="green"
        />
        <StatCard
          title="Completion Rate"
          value={`${analytics?.completionRate || 0}%`}
          icon="✅"
          color="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Top Performers</h3>
          <div className="space-y-3">
            {analytics?.topPerformers?.map((user, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-base)]">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-[var(--primary)]">#{i + 1}</span>
                  <div>
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{user.department}</p>
                  </div>
                </div>
                <span className="font-bold text-[var(--primary)]">{user.score}%</span>
              </div>
            )) || <p className="text-sm text-[var(--text-secondary)]">No data available</p>}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Department Performance</h3>
          <div className="space-y-3">
            {analytics?.departmentStats?.map((dept, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{dept.name}</span>
                  <span className="text-[var(--text-secondary)]">{dept.avgScore}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-base)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                    style={{ width: `${dept.avgScore}%` }}
                  />
                </div>
              </div>
            )) || <p className="text-sm text-[var(--text-secondary)]">No data available</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
