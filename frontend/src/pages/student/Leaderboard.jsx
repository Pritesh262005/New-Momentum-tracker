import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Avatar from '../../components/common/Avatar';
import MomentumRing from '../../components/common/MomentumRing';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function StudentLeaderboard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filter, setFilter] = useState('momentum');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/student/leaderboard', { params: { type: filter } });
      const boardData = response.data?.data?.leaderboard || response.data?.leaderboard || response.data || [];
      const rows = Array.isArray(boardData) ? boardData : [];
      const normalized = rows.map((row) => ({
        _id: row?._id || row?.id,
        name: row?.name || '—',
        rollNumber: row?.rollNumber,
        xpPoints: row?.xpPoints ?? 0,
        department: row?.department || null,
        class: row?.class || null,
        momentum: row?.momentum ?? row?.momentumScore ?? 0,
        avgScore: row?.avgScore ?? 0,
        streak: row?.streak ?? 0
      }));
      setLeaderboard(normalized);
    } catch (error) {
      toast.error('Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const rankColor = (index) => {
    if (index === 0) return '#eab308';
    if (index === 1) return 'var(--text-secondary)';
    if (index === 2) return '#f97316';
    return 'var(--text-secondary)';
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Leaderboard"
        subtitle="Top performers"
        breadcrumbs={['Dashboard', 'Leaderboard']}
      />

      <div className="card p-6 mb-6">
        <div className="flex gap-3">
          <button onClick={() => setFilter('momentum')} className={filter === 'momentum' ? 'btn-primary' : 'btn-secondary'}>Momentum</button>
          <button onClick={() => setFilter('score')} className={filter === 'score' ? 'btn-primary' : 'btn-secondary'}>Score</button>
          <button onClick={() => setFilter('streak')} className={filter === 'streak' ? 'btn-primary' : 'btn-secondary'}>Streak</button>
        </div>
      </div>

      <div className="space-y-4">
        {leaderboard && leaderboard.map((user, index) => (
          <div key={user._id || `${user.name}-${index}`} className="card p-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: rankColor(index) }}>
                  #{index + 1}
                </div>
              </div>

              <Avatar name={user.name} size="lg" />

              <div className="flex-1">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {user.department?.name || user.class?.name || '—'}
                </p>
              </div>

              {filter === 'momentum' && (
                <div className="flex items-center gap-4">
                  <MomentumRing score={user.momentum || 0} size={60} />
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--primary)]">{user.momentum || 0}</div>
                    <p className="text-xs text-[var(--text-secondary)]">Momentum</p>
                  </div>
                </div>
              )}

              {filter === 'score' && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-[var(--primary)]">{user.avgScore || 0}%</div>
                  <p className="text-xs text-[var(--text-secondary)]">Avg Score</p>
                </div>
              )}

              <button className="btn-secondary" onClick={() => setSelectedStudent(user)}>See details</button>

              {filter === 'streak' && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-[var(--primary)]">{String.fromCodePoint(0x1F525)} {user.streak || 0}</div>
                  <p className="text-xs text-[var(--text-secondary)]">Day Streak</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title="Student Details"
        size="sm"
      >
        {selectedStudent ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={selectedStudent.name} size="lg" />
              <div className="min-w-0">
                <div className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
                  {selectedStudent.name}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {selectedStudent.rollNumber ? `Roll: ${selectedStudent.rollNumber}` : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Department</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedStudent.department?.name || '—'}</div>
              </div>
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Class</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedStudent.class?.name || '—'}</div>
              </div>
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>XP</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedStudent.xpPoints ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Streak</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedStudent.streak ?? 0} days</div>
              </div>
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Momentum</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedStudent.momentum ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Avg Score</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedStudent.avgScore ?? 0}%</div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
