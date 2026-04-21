import { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';
import { Calendar, CheckCircle2, Hash, History } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function StudentAttendance() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/attendance/history/student');
      setHistory(data.data || []);
    } catch (err) {
      toast.error('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return toast.error('Enter a valid 6-digit OTP');

    try {
      setSubmitting(true);
      await api.post('/attendance/mark', { otp });
      toast.success('Attendance marked successfully!');
      setOtp('');
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader 
        title="My Attendance" 
        subtitle="Mark your presence using OTP and view history"
        breadcrumbs={[{ label: 'Dashboard', path: '/student' }, { label: 'Attendance' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="card p-8 text-center bg-[var(--bg-card)] border-2 border-[var(--primary)]">
            <div className="w-16 h-16 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Hash size={32} className="text-[var(--primary)]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Enter Attendance OTP</h3>
            <p className="text-sm text-[var(--text-muted)] mb-8">Enter the 6-digit code provided by your teacher during class</p>
            
            <form onSubmit={handleSubmitOTP} className="space-y-8">
              <div className="relative">
                <input 
                  type="text" 
                  maxLength="6"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
                <div className="flex justify-between gap-2 sm:gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i}
                      className={`flex-1 aspect-square sm:aspect-auto sm:h-16 flex items-center justify-center rounded-xl border-2 text-2xl sm:text-3xl font-black transition-all ${
                        otp.length === i 
                          ? 'border-[var(--primary)] bg-[var(--primary-light)] shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105' 
                          : otp.length > i 
                            ? 'border-[var(--primary)] text-[var(--text-primary)]' 
                            : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-base)]'
                      }`}
                    >
                      {otp[i] || ''}
                    </div>
                  ))}
                </div>
              </div>
              <button 
                type="submit" 
                className="btn-primary w-full py-4 text-lg font-bold rounded-xl shadow-xl shadow-[var(--primary-shadow)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
                disabled={submitting || otp.length !== 6}
              >
                {submitting ? 'Marking...' : 'Mark Present'}
              </button>
            </form>
          </div>

          <div className="card p-6 bg-gradient-to-br from-[var(--primary)] to-[var(--cyan)] text-white">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 size={24} />
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">Quick Tip</span>
            </div>
            <p className="font-medium">Regular attendance contributes significantly to your Learning Momentum score. Don't forget to mark it!</p>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="card p-6 h-full">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <History size={20} className="text-[var(--primary)]" />
              Attendance History
            </h3>

            <div className="space-y-4">
              {history.map((record) => (
                <div key={record._id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex flex-col items-center justify-center">
                      <Calendar size={16} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">{record.subject?.name}</div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Periods</div>
                      <div className="flex gap-1">
                        {record.periods.map(p => (
                          <span key={p} className="w-6 h-6 flex items-center justify-center rounded bg-[var(--primary)] text-white text-[10px] font-bold">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div className="px-4 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-black border border-green-500/20">
                      PRESENT
                    </div>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="py-20 text-center">
                  <History size={48} className="mx-auto mb-4 text-[var(--border)]" />
                  <p className="text-[var(--text-muted)]">No attendance history found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
