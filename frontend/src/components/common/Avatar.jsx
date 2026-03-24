import { getInitials } from '../../utils/formatters';

export default function Avatar({ name, size = 'md', color }) {
  const sizes = { sm: 28, md: 36, lg: 48, xl: 64, xxl: 96 };
  const dim = sizes[size] || sizes.md;
  const fontSize = { sm: '11px', md: '13px', lg: '16px', xl: '20px', xxl: '28px' }[size] || '13px';

  const gradients = [
    'from-indigo-400 to-indigo-600',
    'from-violet-400 to-purple-600',
    'from-cyan-400 to-blue-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600',
    'from-rose-400 to-pink-600',
    'from-sky-400 to-indigo-600',
    'from-fuchsia-400 to-violet-600',
  ];

  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradient = gradients && gradients.length > 0 ? gradients[hash % gradients.length] : gradients[0];

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br ${gradient} flex-shrink-0`}
      style={{ width: dim, height: dim, fontSize }}
    >
      {getInitials(name)}
    </div>
  );
}
