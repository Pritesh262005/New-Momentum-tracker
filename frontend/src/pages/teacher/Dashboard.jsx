import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [dashRes, examsRes] = await Promise.all([
          api.get('/teacher/dashboard'),
          api.get('/exams')
        ]);
        setData(dashRes.data?.data || {});
        setExams(examsRes.data?.success && Array.isArray(examsRes.data.data) ? examsRes.data.data : []);
      } catch (error) {
        toast.error('Failed to load dashboard');
        setData({});
        setExams([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcomingExams = useMemo(() => {
    const now = new Date();
    return (exams || [])
      .filter((e) => e?.date && new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [exams]);

  if (loading) return <LoadingSpinner fullscreen />;
  if (!data) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Teacher Dashboard"
        subtitle="Manage your students, exams, and marks"
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/teacher/marks')} className="btn-secondary">Enter Marks</button>
            <button onClick={() => navigate('/teacher/tests/create')} className="btn-primary">+ Create Test</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Students" value={data?.totalStudents || 0} icon="👥" color="indigo" onClick={() => navigate('/teacher/students')} />
        <StatCard title="Tests Created" value={data?.testsCreated || 0} icon="🧪" color="cyan" onClick={() => navigate('/teacher/tests')} />
        <StatCard title="Pending Grading" value={data?.pendingGrading || 0} icon="📝" color="amber" />
        <StatCard title="Avg Momentum" value={`${Math.round((data?.avgMomentum || 0) * 100) / 100}%`} icon="📈" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>At-Risk Students</h3>
            <button className="btn-secondary" onClick={() => navigate('/teacher/students')}>View</button>
          </div>

          {!data?.atRiskStudents || data.atRiskStudents.length === 0 ? (
            <EmptyState icon="✅" title="No at-risk students" subtitle="Great job — no alerts right now" />
          ) : (
            <div className="space-y-3">
              {data.atRiskStudents.slice(0, 8).map((s) => (
                <div key={`${s.name}-${s.score}-${s.risk}`} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.risk}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[var(--primary)]">{Math.round((s.score || 0) * 100) / 100}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Upcoming Exams</h3>
            <button className="btn-secondary" onClick={() => navigate('/teacher/marks')}>Marks</button>
          </div>

          {upcomingExams.length === 0 ? (
            <EmptyState icon="🧾" title="No upcoming exams" subtitle="No exams scheduled yet" />
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((e) => (
                <div key={e._id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{e.name}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(e.date)} • {e.subjects?.length || 0} subjects
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button onClick={() => navigate('/teacher/tests/create')} className="btn-secondary w-full justify-start">🧪 Create Test</button>
          <button onClick={() => navigate('/teacher/marks')} className="btn-secondary w-full justify-start">📝 Enter Exam Marks</button>
          <button onClick={() => navigate('/teacher/results')} className="btn-secondary w-full justify-start">📄 View Results</button>
          <button onClick={() => navigate('/teacher/news')} className="btn-secondary w-full justify-start">📰 Post News</button>
        </div>
      </div>
    </div>
  );
}
