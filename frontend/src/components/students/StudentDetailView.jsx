import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import LoadingSpinner from '../common/LoadingSpinner';
import StatCard from '../common/StatCard';
import Avatar from '../common/Avatar';
import DataTable from '../common/DataTable';
import api from '../../api/axios';
import { useToast } from '../../hooks/useToast';

const formatDate = (d) => {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return '-';
  }
};

export default function StudentDetailView({ roleBase }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  const basePath = useMemo(() => `/${roleBase}`, [roleBase]);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get(`${basePath}/students/${id}`);
        setPayload(res.data?.data || null);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to load student details');
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetail();
  }, [id, basePath]);

  if (loading) return <LoadingSpinner fullscreen />;
  if (!payload?.user) {
    return (
      <div className="page-container">
        <PageHeader
          title="Student Details"
          subtitle="Student not found"
          breadcrumbs={[
            { label: 'Dashboard', path: basePath },
            { label: 'Students', path: `${basePath}/students` },
            { label: 'Details' }
          ]}
        />
        <div className="card p-6">No student data.</div>
      </div>
    );
  }

  const user = payload.user;
  const perf = payload.performance || {};
  const mcqAvg = perf.mcq?.avgScore || 0;
  const mcqTaken = perf.mcq?.testsTaken || 0;
  const examAvg = perf.exams?.avgPercentage || 0;
  const examsTaken = perf.exams?.examsTaken || 0;
  const semesterCurrent = perf.semester?.current ?? user.semester ?? 1;
  const semesterAvgMomentum = perf.semester?.avgMomentum ?? 0;
  const semesterWeeks = perf.semester?.weeks ?? 0;
  const latestMomentum = payload.momentumHistory?.[0]?.score ?? 0;

  const columns = [
    { key: 'week', header: 'Week', render: (row) => formatDate(row.weekStart) },
    { key: 'score', header: 'Momentum', render: (row) => Math.round((row.score || 0) * 100) / 100 }
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Student Details"
        subtitle="Performance overview"
        breadcrumbs={[
          { label: 'Dashboard', path: basePath },
          { label: 'Students', path: `${basePath}/students` },
          { label: user.name }
        ]}
      />

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0">
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {user.name}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {user.rollNumber ? `${user.rollNumber} • ` : ''}
              {user.email}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {user.department?.name ? `Department: ${user.department.name}` : ''}
              {user.class?.name ? ` • Class: ${user.class.name}` : ''}
            </div>
          </div>
          <div className="ml-auto">
            <button className="btn-secondary" onClick={() => navigate(`${basePath}/students`)}>
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon="⚡" label="Momentum" value={Math.round(latestMomentum)} color="indigo" />
        <StatCard icon="📝" label="MCQ Avg" value={`${mcqAvg}%`} sub={`${mcqTaken} tests`} color="cyan" />
        <StatCard icon="📚" label="Exam Avg" value={`${examAvg}%`} sub={`${examsTaken} exams`} color="violet" />
        <StatCard icon="🎓" label={`Semester S${semesterCurrent}`} value={Math.round(semesterAvgMomentum)} sub={`${semesterWeeks} weeks avg`} color="green" />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
              Momentum History
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Last 10 weeks (latest first)
            </div>
          </div>
        </div>
        <DataTable columns={columns} data={payload.momentumHistory || []} rowKey="_id" />
      </div>
    </div>
  );
}
