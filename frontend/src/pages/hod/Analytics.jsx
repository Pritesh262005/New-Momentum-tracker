import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

const years = [1, 2, 3, 4];

export default function HODAnalytics() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('');
  const [analytics, setAnalytics] = useState({
    totalTests: 0,
    avgScore: 0,
    passRate: 0,
    completionRate: 0,
    topPerformers: [],
    subjectStats: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, [year]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/hod/analytics', { params: { year } });
      setAnalytics(response.data?.data || {
        totalTests: 0,
        avgScore: 0,
        passRate: 0,
        completionRate: 0,
        topPerformers: [],
        subjectStats: []
      });
    } catch (error) {
      showToast('Failed to load analytics', 'error');
      setAnalytics({
        totalTests: 0,
        avgScore: 0,
        passRate: 0,
        completionRate: 0,
        topPerformers: [],
        subjectStats: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Analytics"
        subtitle="Department analytics and insights"
        breadcrumbs={[{ label: 'Dashboard', path: '/hod' }, { label: 'Analytics' }]}
        actions={
          <select className="input-base min-w-[180px]" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All Years</option>
            {years.map((item) => <option key={item} value={item}>Year {item}</option>)}
          </select>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Tests" value={analytics?.totalTests || 0} icon="📝" color="indigo" />
        <StatCard title="Avg Score" value={`${analytics?.avgScore || 0}%`} icon="📊" color="cyan" />
        <StatCard title="Pass Rate" value={`${analytics?.passRate || 0}%`} icon="✅" color="green" />
        <StatCard title="Completion" value={`${analytics?.completionRate || 0}%`} icon="🎯" color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Top Performers</h3>
          <div className="space-y-3">
            {analytics.topPerformers.length > 0 ? analytics.topPerformers.map((student, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-base)]">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-[var(--primary)]">#{i + 1}</span>
                  <div>
                    <p className="font-semibold text-sm">{student.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{student.email}</p>
                  </div>
                </div>
                <span className="font-bold text-[var(--primary)]">{student.avgScore}%</span>
              </div>
            )) : <p className="text-sm text-[var(--text-secondary)]">No data available</p>}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Subject Performance</h3>
          <div className="space-y-3">
            {analytics.subjectStats.length > 0 ? analytics.subjectStats.map((subject, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{subject.name}</span>
                  <span className="text-[var(--text-secondary)]">{subject.avgScore}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-base)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                    style={{ width: `${subject.avgScore}%` }}
                  />
                </div>
              </div>
            )) : <p className="text-sm text-[var(--text-secondary)]">No data available</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
