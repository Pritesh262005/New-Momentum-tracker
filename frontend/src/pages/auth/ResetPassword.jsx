import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/axios';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      const token = searchParams.get('token');
      await api.post('/auth/reset-password', { token, password: formData.password });
      showToast('Password reset successfully!', 'success');
      navigate('/login');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">
              <img src="/almts-mark.svg" alt="ALMTS" />
            </div>
          </div>
          <h1>Reset Password</h1>
          <p>Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
