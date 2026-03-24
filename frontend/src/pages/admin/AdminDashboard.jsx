import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/dashboard');
        setData(res.data?.data || {});
      } catch (e) {
        toast.error('Failed to load dashboard');
        setData({});
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Admin Dashboard"
        subtitle={`Welcome back, ${user?.name || 'Admin'}`}
        breadcrumbs={['Dashboard']}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard icon="👥" label="Users" value={data?.totalUsers || 0} color="indigo" />
        <StatCard icon="🎓" label="Students" value={data?.totalStudents || 0} color="cyan" />
        <StatCard icon="👨‍🏫" label="Teachers" value={data?.totalProfessors || 0} color="violet" sub="(incl. Professors)" />
        <StatCard icon="🏛️" label="Departments" value={data?.totalDepartments || 0} color="amber" />
        <StatCard icon="🏫" label="Classes" value={data?.totalClasses || 0} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-1">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/admin/users')} className="btn-secondary w-full justify-start">
              👥 Manage Users
            </button>
            <button onClick={() => navigate('/admin/departments')} className="btn-secondary w-full justify-start">
              🏛️ Manage Departments
            </button>
            <button onClick={() => navigate('/admin/analytics')} className="btn-secondary w-full justify-start">
              📊 Analytics
            </button>
            <button onClick={() => navigate('/admin/news')} className="btn-secondary w-full justify-start">
              📰 News
            </button>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
          {!data?.recentAuditLogs || data.recentAuditLogs.length === 0 ? (
            <EmptyState icon="🧾" title="No activity yet" subtitle="Recent admin activity will appear here" />
          ) : (
            <div className="space-y-3">
              {data.recentAuditLogs.map((log) => (
                <div
                  key={log._id || `${log.action}-${log.createdAt}`}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {log.action}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        By {log.performedBy?.name || 'Unknown'} • {formatDateTime(log.createdAt)}
                      </div>
                    </div>
                    {log.performedBy?.role && (
                      <span className="badge badge-gray">{log.performedBy.role}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
