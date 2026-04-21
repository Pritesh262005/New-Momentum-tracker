import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime, getGrade } from '../../utils/formatters';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [exams, setExams] = useState([]);
  const [showMomentumModal, setShowMomentumModal] = useState(false);

  const upcomingExams = useMemo(() => {
    const now = new Date();
    return (exams || [])
      .filter((e) => e?.date && new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [exams]);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: d }, { data: e }] = await Promise.all([
          api.get('/student/dashboard'),
          api.get('/exams')
        ]);
        setDash(d?.data || {});
        setExams(e?.success && Array.isArray(e.data) ? e.data : []);
      } catch (err) {
        toast.error('Failed to load dashboard');
        setDash({});
        setExams([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingSpinner fullscreen />;

  const grade = getGrade(dash?.momentum ?? 0);
  const ms2 = dash?.momentumScore2;
  const nextPred = ms2?.nextWeek?.predictedScore;
  const nextLow = ms2?.nextWeek?.rangeLow;
  const nextHigh = ms2?.nextWeek?.rangeHigh;
  const isAnomaly = Boolean(ms2?.anomaly?.isAnomaly);
  const forecastSub = nextPred === null || nextPred === undefined
    ? 'Need 3+ weeks history'
    : isAnomaly
      ? 'Unusual change detected'
      : (nextLow !== null && nextLow !== undefined && nextHigh !== null && nextHigh !== undefined)
        ? `95% range ${nextLow}-${nextHigh}`
        : 'Trend-based forecast';

  return (
    <div className="page-container">
      <PageHeader
        title="Student Dashboard"
        subtitle={`Welcome back, ${user?.name || 'Student'}`}
        breadcrumbs={['Dashboard']}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8">
        <StatCard icon="ML" label="Next Week" value={nextPred === null || nextPred === undefined ? 'N/A' : `${Math.round(nextPred * 100) / 100}%`} color={isAnomaly ? 'red' : 'violet'} sub={forecastSub} />
        <StatCard 
          icon="📈" 
          label="Momentum" 
          value={`${dash?.momentum ?? 0}%`} 
          color={grade.color === 'green' ? 'green' : grade.color === 'red' ? 'red' : 'amber'} 
          sub="View Details"
          onClick={() => setShowMomentumModal(true)}
        />
        <StatCard icon="⭐" label="XP Points" value={dash?.xpPoints ?? 0} color="indigo" />
        <StatCard icon="🔥" label="Streak" value={`${dash?.streak ?? 0} days`} color="rose" />
        <StatCard icon="🧪" label="Upcoming Tests" value={dash?.upcomingTests?.length ?? 0} color="cyan" />
        <StatCard icon="🧾" label="Upcoming Exams" value={upcomingExams.length} color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-1">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/student/tests')} className="btn-secondary w-full justify-start">🧪 Tests</button>
            <button onClick={() => navigate('/student/results')} className="btn-secondary w-full justify-start">📄 Results / Marksheet</button>
            <button onClick={() => navigate('/student/leaderboard')} className="btn-secondary w-full justify-start">🏆 Leaderboard</button>
            <button onClick={() => navigate('/student/profile')} className="btn-secondary w-full justify-start">👤 Profile</button>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Upcoming</h3>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => navigate('/student/tests')}>Tests</button>
              <button className="btn-secondary" onClick={() => navigate('/student/results')}>Exams</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Upcoming Tests</p>
              {!dash?.upcomingTests || dash.upcomingTests.length === 0 ? (
                <EmptyState icon="🧪" title="No upcoming tests" subtitle="You are all caught up" />
              ) : (
                <div className="space-y-3">
                  {dash.upcomingTests.slice(0, 5).map((t) => (
                    <div key={t._id} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatDateTime(t.startTime)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Upcoming Exams</p>
              {upcomingExams.length === 0 ? (
                <EmptyState icon="🧾" title="No upcoming exams" subtitle="No exams scheduled yet" />
              ) : (
                <div className="space-y-3">
                  {upcomingExams.map((e) => (
                    <div key={e._id} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{e.name}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatDateTime(e.date)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Results</h3>
            {!dash?.recentResults || dash.recentResults.length === 0 ? (
              <EmptyState icon="📄" title="No results yet" subtitle="Complete a test to see results here" />
            ) : (
              <div className="space-y-3">
                {dash.recentResults.slice(0, 5).map((r) => (
                  <div key={r._id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{r.test?.title || 'Test'}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {r.submittedAt ? formatDateTime(r.submittedAt) : '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[var(--primary)]">{Math.round((r.percentage || 0) * 100) / 100}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <MomentumDetailsModal isOpen={showMomentumModal} onClose={() => setShowMomentumModal(false)} />
    </div>
  );
};

const MomentumDetailsModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const { data: d } = await api.get('/student/momentum-details');
          setData(d?.data || {});
        } catch (err) {
          console.error('Failed to load momentum details', err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const chartData = data?.momentumHistory?.map(h => ({
    date: new Date(h.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: h.score
  })) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Momentum Score Analysis" size="xl">
      {loading ? <LoadingSpinner /> : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 bg-[var(--bg-base)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Consistency</div>
              <div className="text-2xl font-bold">{data?.momentumHistory?.slice(-1)[0]?.consistency || 0}%</div>
            </div>
            <div className="card p-4 bg-[var(--bg-base)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Improvement</div>
              <div className="text-2xl font-bold">{data?.momentumHistory?.slice(-1)[0]?.improvement || 0}%</div>
            </div>
            <div className="card p-4 bg-[var(--bg-base)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Focus Score</div>
              <div className="text-2xl font-bold">{data?.momentumHistory?.slice(-1)[0]?.focus || 0}%</div>
            </div>
          </div>

          <div className="card p-6 bg-[var(--bg-base)]">
            <h4 className="text-sm font-bold mb-6 text-[var(--text-primary)]">Learning Momentum Trend</h4>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--primary)' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Recent MCQ & Assignment Performance</h4>
              <div className="space-y-3">
                {[...(data?.mcqHistory || []), ...(data?.assignmentHistory || [])]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 6)
                  .map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{item.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">{new Date(item.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-bold text-[var(--primary)]">{Math.round(item.percentage)}%</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{item.score}/{item.maxScore}</div>
                      </div>
                    </div>
                  ))
                }
                {(!data?.mcqHistory?.length && !data?.assignmentHistory?.length) && (
                  <div className="text-sm text-[var(--text-muted)] text-center py-4">No recent scores found</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Exam Results</h4>
              <div className="space-y-3">
                {(data?.examHistory || []).map((exam, idx) => (
                  <div key={idx} className="p-4 rounded-xl border-l-4 border-l-[var(--primary)] bg-[var(--bg-card)] border border-[var(--border)]">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold">{exam.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">{new Date(exam.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-lg font-black text-[var(--primary)]">{Math.round(exam.percentage)}%</div>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-[var(--bg-base)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${exam.percentage}%` }} />
                    </div>
                  </div>
                ))}
                {!data?.examHistory?.length && (
                  <div className="text-sm text-[var(--text-muted)] text-center py-4">No exam results found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default StudentDashboard;
