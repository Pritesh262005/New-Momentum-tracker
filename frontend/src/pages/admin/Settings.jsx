import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Toggle from '../../components/common/Toggle';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function AdminSettings() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    allowRegistration: true,
    requireEmailVerification: false,
    maintenanceMode: false,
    maxTestDuration: 180,
    minPassPercentage: 40
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/admin/settings', settings);
      showToast('Settings saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Settings"
        subtitle="Configure system settings"
        breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Settings' }]}
      />

      <div className="card p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold mb-4">General Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Allow Registration</p>
                <p className="text-sm text-[var(--text-secondary)]">Allow new users to register</p>
              </div>
              <Toggle
                checked={settings.allowRegistration}
                onChange={(checked) => setSettings({ ...settings, allowRegistration: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Email Verification</p>
                <p className="text-sm text-[var(--text-secondary)]">Require email verification for new accounts</p>
              </div>
              <Toggle
                checked={settings.requireEmailVerification}
                onChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Maintenance Mode</p>
                <p className="text-sm text-[var(--text-secondary)]">Put system in maintenance mode</p>
              </div>
              <Toggle
                checked={settings.maintenanceMode}
                onChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-6">
          <h3 className="text-lg font-bold mb-4">Test Settings</h3>
          <div className="space-y-4">
            <div className="form-group">
              <label>Max Test Duration (minutes)</label>
              <input
                type="number"
                value={settings.maxTestDuration}
                onChange={(e) => setSettings({ ...settings, maxTestDuration: parseInt(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Minimum Pass Percentage</label>
              <input
                type="number"
                value={settings.minPassPercentage}
                onChange={(e) => setSettings({ ...settings, minPassPercentage: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={loading} className="btn-primary">
            {loading ? <LoadingSpinner /> : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
