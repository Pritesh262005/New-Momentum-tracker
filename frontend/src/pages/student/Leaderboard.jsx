import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Avatar from '../../components/common/Avatar';
import MomentumRing from '../../components/common/MomentumRing';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function StudentLeaderboard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filter, setFilter] = useState('momentum');

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/student/leaderboard', { params: { type: filter } });
      const boardData = response.data?.data?.leaderboard || response.data?.leaderboard || response.data || [];
      setLeaderboard(Array.isArray(boardData) ? boardData : []);
    } catch (error) {
      toast.error('Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
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
          <div key={user._id} className="card p-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-[var(--text-secondary)]'}`}>
                  #{index + 1}
                </div>
              </div>

              <Avatar name={user.name} size="lg" />

              <div className="flex-1">
                <h3 className="text-lg font-bold">{user.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{user.department?.name}</p>
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

              {filter === 'streak' && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-[var(--primary)]">🔥 {user.streak || 0}</div>
                  <p className="text-xs text-[var(--text-secondary)]">Day Streak</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
