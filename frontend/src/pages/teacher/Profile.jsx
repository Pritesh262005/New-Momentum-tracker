import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Avatar from '../../components/common/Avatar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function TeacherProfile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name, email: user.email, phone: user.phone || '' });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/teacher/profile', formData);
      updateUser(data);
      showToast('Profile updated successfully', 'success');
      setEditing(false);
    } catch (error) {
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Profile"
        subtitle="Manage your profile"
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Profile' }]}
        actions={!editing && <button onClick={() => setEditing(true)} className="btn-primary">Edit Profile</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <Avatar name={user?.name} size="xl" className="mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-1">{user?.name}</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-2">{user?.email}</p>
          <span className="badge badge-cyan">Teacher</span>
        </div>

        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-bold mb-6">Personal Information</h3>
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <LoadingSpinner /> : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Name</p>
                <p className="font-semibold">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Email</p>
                <p className="font-semibold">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Phone</p>
                <p className="font-semibold">{user?.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Department</p>
                <p className="font-semibold">{user?.department?.name || 'Not assigned'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
