import { formatDistanceToNow, format } from 'date-fns';

export const timeAgo = (date) => {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatDate = (date) =>
  date ? format(new Date(date), 'MMM d, yyyy') : '—';

export const formatDateTime = (date) =>
  date ? format(new Date(date), 'MMM d, yyyy · h:mm a') : '—';

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

export const formatDuration = (mins) => {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${m ? m + 'm' : ''}` : `${m}m`;
};

export const getGrade = (pct) => {
  if (!pct && pct !== 0) return { letter: 'N/A', className: 'badge-gray', color: '#6b7280', label: 'N/A' };
  if (pct >= 90) return { letter: 'A+', className: 'badge-green', color: '#10b981', label: 'A+' };
  if (pct >= 80) return { letter: 'A', className: 'badge-cyan', color: '#06b6d4', label: 'A' };
  if (pct >= 70) return { letter: 'B', className: 'badge-indigo', color: '#6366f1', label: 'B' };
  if (pct >= 60) return { letter: 'C', className: 'badge-amber', color: '#f59e0b', label: 'C' };
  if (pct >= 50) return { letter: 'D', className: 'badge-orange', color: '#f97316', label: 'D' };
  return { letter: 'F', className: 'badge-red', color: '#ef4444', label: 'F' };
};

export const getMomentumConfig = (score) => {
  if (score >= 70) return { label: 'High', color: '#10b981', bg: 'rgba(16,185,129,0.12)', ring: '#10b981' };
  if (score >= 40) return { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', ring: '#f59e0b' };
  return { label: 'Low', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', ring: '#ef4444' };
};

export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return (parts[0]?.[0] + (parts[1]?.[0] || '')).toUpperCase();
};

export const formatSeconds = (totalSecs) => {
  const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  return totalSecs >= 3600 ? `${h}:${m}:${s}` : `${m}:${s}`;
};
