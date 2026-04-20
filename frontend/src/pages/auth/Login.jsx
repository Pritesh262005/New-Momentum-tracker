import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { jsPDF } from 'jspdf';

const downloadUnblockPdf = ({ name, rollNumber, email, reason }) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const line = (y) => doc.line(margin, y, pageWidth - margin, y);

  const today = new Date();
  const dateStr = today.toLocaleDateString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Account Unblock Request Form (ALMTS)', margin, 64);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date: ${dateStr}`, margin, 84);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('User Details', margin, 120);
  doc.setFont('helvetica', 'normal');

  const rows = [
    ['User Name', name || '-'],
    ['Roll Number', rollNumber || '-'],
    ['Email', email || '-'],
    ['Reason', reason || '']
  ];

  let y = 146;
  for (const [k, v] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${k}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(String(v || ''), pageWidth - margin * 2 - 90);
    doc.text(wrapped.length ? wrapped : [''], margin + 90, y);
    y += Math.max(18, wrapped.length * 14);
  }

  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.text('Mentor Verification', margin, y);
  doc.setFont('helvetica', 'normal');

  y += 28;
  doc.text('Mentor Name:', margin, y);
  line(y + 6);

  y += 36;
  doc.text('Mentor Signature:', margin, y);
  line(y + 6);

  y += 44;
  doc.setFontSize(10);
  doc.text('Submit this signed form to your mentor/admin for account re-activation.', margin, y);

  const safe = String(rollNumber || email || 'user').replace(/[^a-zA-Z0-9._-]/g, '_');
  doc.save(`almts-unblock-request-${safe}.pdf`);
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [blockedInfo, setBlockedInfo] = useState(null); // { name,email,rollNumber,reason,role }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      setBlockedInfo(null);
      const user = await login(formData.email, formData.password);
      toast.success('Welcome back!');
      const roleRoutes = {
        ADMIN: '/admin',
        HOD: '/hod',
        TEACHER: '/teacher',
        STUDENT: '/student'
      };
      navigate(roleRoutes[user.role] || '/login');
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 403 && data?.blocked) {
        setBlockedInfo({
          name: data?.data?.name || '',
          email: data?.data?.email || formData.email,
          rollNumber: data?.data?.rollNumber || '',
          role: data?.data?.role || '',
          reason: data?.data?.reason || ''
        });
        toast.error(data?.message || 'Your account was blocked by admin');
      } else {
        toast.error(data?.message || error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (blockedInfo) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Account Blocked</h1>
            <p>Your account was blocked by admin. Download the unblock request form.</p>
          </div>

          <div className="auth-form space-y-4">
            <div className="card p-4" style={{ background: 'var(--bg-base)' }}>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}><b>Name:</b> {blockedInfo.name || '-'}</div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}><b>Roll:</b> {blockedInfo.rollNumber || '-'}</div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}><b>Email:</b> {blockedInfo.email || '-'}</div>
              {blockedInfo.reason && (
                <div className="text-sm mt-2" style={{ color: 'var(--text-primary)' }}><b>Reason:</b> {blockedInfo.reason}</div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => downloadUnblockPdf({
                  name: blockedInfo.name,
                  rollNumber: blockedInfo.rollNumber,
                  email: blockedInfo.email,
                  reason: blockedInfo.reason
                })}
              >
                Download Unblock Form (PDF)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => {
                  setBlockedInfo(null);
                }}
              >
                Back
              </button>
            </div>
          </div>

          <div className="auth-footer">
            <p>Submit the signed form to your mentor/admin for re-activation.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">
              <img src="/almts-mark.svg" alt="ALMTS" />
            </div>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to continue to ALMTS</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="auth-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="link">Forgot password?</Link>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Need an account? Contact your administrator</p>
        </div>
      </div>
    </div>
  );
}
