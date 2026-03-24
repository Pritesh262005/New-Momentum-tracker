import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function HODDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/hod/dashboard');
      const dashData = response.data?.data || {};
      setData(dashData);
    } catch (error) {
      toast.error('Failed to load dashboard');
      setData({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;
  if (!data) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="HOD Dashboard"
        subtitle="Manage your department"
        breadcrumbs={['Dashboard']}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Teachers" value={data?.totalTeachers || 0} icon="👨‍🏫" color="indigo" />
        <StatCard title="Students" value={data?.totalStudents || 0} icon="👥" color="cyan" />
        <StatCard title="Active Tests" value={data?.activeTests || 0} icon="📝" color="violet" />
        <StatCard title="Avg Score" value={`${data?.avgScore || 0}%`} icon="📊" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Department Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Test Completion Rate</span>
                <span className="text-sm text-[var(--text-secondary)]">{data?.completionRate || 0}%</span>
              </div>
              <div className="h-2 bg-[var(--bg-base)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${data?.completionRate || 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Average Attendance</span>
                <span className="text-sm text-[var(--text-secondary)]">{data?.avgAttendance || 0}%</span>
              </div>
              <div className="h-2 bg-[var(--bg-base)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: `${data?.avgAttendance || 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/hod/teachers')} className="btn-secondary w-full justify-start">
              👨‍🏫 Manage Teachers
            </button>
            <button onClick={() => navigate('/hod/students')} className="btn-secondary w-full justify-start">
              👥 Manage Students
            </button>
            <button onClick={() => navigate('/hod/tests')} className="btn-secondary w-full justify-start">
              📝 View Tests
            </button>
            <button onClick={() => navigate('/hod/analytics')} className="btn-secondary w-full justify-start">
              📊 View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
