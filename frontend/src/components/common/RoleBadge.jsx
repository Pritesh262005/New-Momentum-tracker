export default function RoleBadge({ role, size = 'md' }) {
  const config = {
    ADMIN: { className: 'badge-rose', label: 'Admin' },
    HOD: { className: 'badge-violet', label: 'HOD' },
    TEACHER: { className: 'badge-cyan', label: 'Teacher' },
    STUDENT: { className: 'badge-green', label: 'Student' },
  };

  const { className, label } = config[role] || { className: 'badge-gray', label: role };
  const sizeClass = size === 'xs' ? 'text-[9px] px-2 py-0.5' : '';

  return <span className={`badge ${className} ${sizeClass}`}>{label}</span>;
}
