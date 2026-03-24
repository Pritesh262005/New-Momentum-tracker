import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/axios';

export default function ForgotPassword() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      showToast('Reset link sent to your email', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to send reset link', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="logo-icon">
                <img src="/almts-mark.svg" alt="ALMTS" />
              </div>
            </div>
            <h1>Check Your Email</h1>
            <p>We've sent a password reset link to <strong>{email}</strong></p>
          </div>
          <div className="auth-footer">
            <Link to="/login" className="btn btn-secondary btn-lg">Back to Login</Link>
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
          <h1>Forgot Password?</h1>
          <p>Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="link">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
