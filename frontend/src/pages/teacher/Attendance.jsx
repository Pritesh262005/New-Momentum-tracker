import { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';
import { Check, ClipboardCheck, Clock, Users } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const periods = [1, 2, 3, 4, 5, 6, 7];

export default function TeacherAttendance() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [form, setForm] = useState({
    subjectId: '',
    selectedPeriods: [],
    year: 1,
    semester: 1,
    duration: 10
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [subsRes, histRes] = await Promise.all([
        api.get('/teacher/subjects'),
        api.get('/attendance/history/teacher')
      ]);
      setSubjects(subsRes.data.data || []);
      setHistory(histRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodToggle = (p) => {
    setForm(prev => ({
      ...prev,
      selectedPeriods: prev.selectedPeriods.includes(p)
        ? prev.selectedPeriods.filter(x => x !== p)
        : [...prev.selectedPeriods, p]
    }));
  };

  const handleGenerateOTP = async (e) => {
    e.preventDefault();
    if (!form.subjectId) return toast.error('Select a subject');
    if (form.selectedPeriods.length === 0) return toast.error('Select at least one period');

    try {
      setLoading(true);
      const { data } = await api.post('/attendance/session', {
        subjectId: form.subjectId,
        periods: form.selectedPeriods,
        year: form.year,
        semester: form.semester,
        durationMinutes: form.duration
      });
      setActiveSession(data.data);
      toast.success('OTP Generated!');
      fetchInitialData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !subjects.length) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader 
        title="Attendance Management" 
        subtitle="Generate OTP and track student attendance"
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Attendance' }]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={20} className="text-[var(--primary)]" />
              Take Attendance
            </h3>
            <form onSubmit={handleGenerateOTP} className="space-y-4">
              <div className="form-group">
                <label>Subject</label>
                <select 
                  className="input" 
                  value={form.subjectId} 
                  onChange={e => setForm({...form, subjectId: e.target.value})}
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Year</label>
                  <select className="input" value={form.year} onChange={e => setForm({...form, year: Number(e.target.value)})}>
                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <select className="input" value={form.semester} onChange={e => setForm({...form, semester: Number(e.target.value)})}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="mb-2 block">Select Periods</label>
                <div className="flex flex-wrap gap-2">
                  {periods.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePeriodToggle(p)}
                      className={`w-10 h-10 rounded-lg border transition-all font-bold text-sm ${
                        form.selectedPeriods.includes(p)
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg'
                          : 'bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>OTP Duration (Minutes)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={form.duration} 
                  onChange={e => setForm({...form, duration: Number(e.target.value)})}
                  min="1"
                  max="60"
                />
              </div>

              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? 'Generating...' : 'Generate OTP'}
              </button>
            </form>
          </div>

          {activeSession && (
            <div className="card p-6 border-2 border-[var(--primary)] bg-[var(--primary-light)] overflow-hidden relative">
              <div className="absolute -right-4 -top-4 opacity-5">
                <Users size={120} className="text-[var(--primary)]" />
              </div>
              <div className="text-center relative z-10">
                <p className="text-sm font-bold text-[var(--primary)] uppercase tracking-widest mb-4">Active Session OTP</p>
                <div className="flex justify-center gap-2 mb-6">
                  {String(activeSession.otp).split('').map((digit, i) => (
                    <div key={i} className="w-10 h-14 sm:w-12 sm:h-16 bg-[var(--bg-card)] border-2 border-[var(--primary)] rounded-xl flex items-center justify-center text-3xl font-black text-[var(--text-primary)] shadow-lg shadow-[var(--primary-shadow)]">
                      {digit}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <Clock size={16} className="text-[var(--primary)]" />
                    <span>Expires at {new Date(activeSession.expiresAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                    <Check size={14} />
                    <span>Subject: {subjects.find(s => s._id === activeSession.subject)?.name}</span>
                    <span className="mx-1">•</span>
                    <span>Periods: {activeSession.periods.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-2">
          <div className="card p-6 h-full">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-[var(--primary)]" />
              Attendance History
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-3 font-semibold text-sm">Date</th>
                    <th className="pb-3 font-semibold text-sm">Subject</th>
                    <th className="pb-3 font-semibold text-sm">Periods</th>
                    <th className="pb-3 font-semibold text-sm">Present</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {history.map((h) => (
                    <tr key={h._id} className="hover:bg-[var(--bg-base)] transition-colors">
                      <td className="py-4 text-sm">{new Date(h.date).toLocaleDateString()}</td>
                      <td className="py-4 font-medium text-sm">{h.subject?.name}</td>
                      <td className="py-4">
                        <div className="flex gap-1">
                          {h.periods.map(p => (
                            <span key={p} className="px-2 py-0.5 rounded bg-[var(--bg-base)] text-[10px] font-bold border border-[var(--border)]">{p}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="badge badge-green">{h.presentCount} Students</span>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-10 text-center text-[var(--text-muted)]">No attendance records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
