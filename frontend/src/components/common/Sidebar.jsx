import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Building2,
  Calculator,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Newspaper,
  Paperclip,
  PlusCircle,
  Settings,
  Sun,
  Trophy,
  User,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Avatar from './Avatar';
import RoleBadge from './RoleBadge';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const iconProps = { size: 18, strokeWidth: 2.25 };

  const NavItem = ({ to, icon, label, badge }) => (
    <NavLink
      to={to}
      className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all relative group"
      style={({ isActive }) =>
        isActive
          ? {
              color: 'var(--sidebar-active-text)',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(20,184,166,0.12))',
              border: '1px solid rgba(59,130,246,0.24)',
              boxShadow: 'inset 0 0 20px rgba(59,130,246,0.08)'
            }
          : {
              color: 'var(--sidebar-text)',
              border: '1px solid transparent'
            }
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r" style={{ background: 'var(--primary)' }} />
          )}
          <span className="flex-shrink-0 transition-transform group-hover:scale-110">{icon}</span>
          <span className="text-sm font-semibold">{label}</span>
          {badge && (
            <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse ${
              badge.color === 'red' ? 'bg-rose-500 text-white' :
              badge.color === 'amber' ? 'bg-amber-500 text-black' :
              'bg-cyan-500 text-black'
            }`}>
              {badge.count}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  const navConfig = {
    ADMIN: [
      { group: 'MANAGEMENT', items: [
        { to: '/admin', icon: <LayoutDashboard {...iconProps} />, label: 'Dashboard' },
        { to: '/admin/users', icon: <Users {...iconProps} />, label: 'Users' },
        { to: '/admin/departments', icon: <Building2 {...iconProps} />, label: 'Departments' },
        { to: '/admin/subjects', icon: <BookOpen {...iconProps} />, label: 'Subjects' }
      ]},
      { group: 'CONTENT', items: [
        { to: '/admin/news', icon: <Newspaper {...iconProps} />, label: 'News' },
        { to: '/admin/analytics', icon: <BarChart3 {...iconProps} />, label: 'Analytics' },
        { to: '/admin/settings', icon: <Settings {...iconProps} />, label: 'Settings' }
      ]}
    ],
    HOD: [
      { group: 'OVERVIEW', items: [
        { to: '/hod', icon: <LayoutDashboard {...iconProps} />, label: 'Dashboard' },
        { to: '/hod/teachers', icon: <Users {...iconProps} />, label: 'Teachers' },
        { to: '/hod/students', icon: <GraduationCap {...iconProps} />, label: 'Students' },
        { to: '/hod/semester-upgrade', icon: <PlusCircle {...iconProps} />, label: 'Semester Upgrade' },
        { to: '/hod/subjects', icon: <BookOpen {...iconProps} />, label: 'Subjects' },
        { to: '/hod/study-notes', icon: <BookOpen {...iconProps} />, label: 'Study Notes' },
        { to: '/hod/tests', icon: <ClipboardList {...iconProps} />, label: 'Tests' },
        { to: '/hod/exams', icon: <FileText {...iconProps} />, label: 'Exams' },
        { to: '/hod/news', icon: <Newspaper {...iconProps} />, label: 'News' },
        { to: '/hod/leaderboard', icon: <Trophy {...iconProps} />, label: 'Leaderboard' },
        { to: '/hod/chat', icon: <MessageSquare {...iconProps} />, label: 'Chat' },
        { to: '/hod/analytics', icon: <BarChart3 {...iconProps} />, label: 'Analytics' },
        { to: '/hod/profile', icon: <User {...iconProps} />, label: 'Profile' }
      ]}
    ],
    TEACHER: [
      { group: 'TEACHING', items: [
        { to: '/teacher', icon: <LayoutDashboard {...iconProps} />, label: 'Dashboard' },
        { to: '/teacher/tests', icon: <ClipboardList {...iconProps} />, label: 'Tests' },
        { to: '/teacher/tests/create', icon: <PlusCircle {...iconProps} />, label: 'Create Test' },
        { to: '/teacher/subjects', icon: <BookOpen {...iconProps} />, label: 'Subjects' },
        { to: '/teacher/leaderboard', icon: <Trophy {...iconProps} />, label: 'Leaderboard' },
        { to: '/teacher/results', icon: <BarChart3 {...iconProps} />, label: 'Results' },
        { to: '/teacher/marks', icon: <Calculator {...iconProps} />, label: 'Marks' },
        { to: '/teacher/students', icon: <GraduationCap {...iconProps} />, label: 'Students' },
        { to: '/teacher/assignments', icon: <Paperclip {...iconProps} />, label: 'Assignments' },
        { to: '/teacher/study-notes', icon: <BookOpen {...iconProps} />, label: 'Study Notes' },
        { to: '/teacher/chat', icon: <MessageSquare {...iconProps} />, label: 'Chat' },
        { to: '/teacher/news', icon: <Newspaper {...iconProps} />, label: 'News' },
        { to: '/teacher/profile', icon: <User {...iconProps} />, label: 'Profile' }
      ]}
    ],
    STUDENT: [
      { group: 'LEARN', items: [
        { to: '/student', icon: <LayoutDashboard {...iconProps} />, label: 'Dashboard' },
        { to: '/student/subjects', icon: <BookOpen {...iconProps} />, label: 'Subjects' },
        { to: '/student/study', icon: <BookOpen {...iconProps} />, label: 'Study' },
        { to: '/student/tests', icon: <ClipboardList {...iconProps} />, label: 'Tests' },
        { to: '/student/results', icon: <BarChart3 {...iconProps} />, label: 'Results' },
        { to: '/student/assignments', icon: <Paperclip {...iconProps} />, label: 'Assignments' },
        { to: '/student/chat', icon: <MessageSquare {...iconProps} />, label: 'Chat' },
        { to: '/student/news', icon: <Newspaper {...iconProps} />, label: 'News' }
      ]},
      { group: 'COMPETE', items: [
        { to: '/student/leaderboard', icon: <Trophy {...iconProps} />, label: 'Leaderboard' },
        { to: '/student/profile', icon: <User {...iconProps} />, label: 'Profile' }
      ]}
    ]
  };

  const nav = navConfig[user?.role] || [];

  return (
    <div
      className="sidebar fixed left-0 top-0 w-60 h-screen flex flex-col z-50 transition-all"
      style={{
        background: 'var(--sidebar-panel)',
        borderRight: '1px solid var(--sidebar-border)',
        boxShadow: 'var(--sidebar-shadow)'
      }}
    >
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2 group cursor-pointer">
          <img src="/almts-mark.svg" alt="ALMTS" className="w-9 h-9 transition-transform group-hover:scale-110" />
          <span className="gradient-text font-bold text-xl">ALMTS</span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--sidebar-muted)' }}>Learning Platform</p>
      </div>

      <div style={{ height: 1, background: 'var(--sidebar-divider)' }} />

      <div
        className="mx-3 my-4 p-3 rounded-xl transition-all hover:shadow-lg"
        style={{ background: 'var(--sidebar-user-bg)', border: '1px solid var(--sidebar-user-border)' }}
      >
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--sidebar-strong)' }}>{user?.name}</p>
            <RoleBadge role={user?.role} size="xs" />
          </div>
        </div>
        {user?.role === 'STUDENT' && user?.xpPoints > 0 && (
          <div className="mt-2 text-xs font-mono" style={{ color: 'var(--sidebar-accent)' }}>XP {user.xpPoints}</div>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--sidebar-divider)' }} />

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {nav.map((section, i) => (
          <div key={i}>
            <div
              className="text-[10px] uppercase tracking-wider px-3 pt-3 pb-1 font-bold"
              style={{ color: 'var(--sidebar-section)' }}
            >
              {section.group}
            </div>
            {section.items.map((item, j) => (
              <NavItem key={j} {...item} />
            ))}
          </div>
        ))}
      </div>

      <div className="px-3 pb-4 mt-auto space-y-1">
        {user?.role === 'STUDENT' && user?.currentStreak > 0 && (
          <div
            className="text-xs font-bold px-3 py-2 rounded-[10px] w-full text-center transition-all hover:shadow-lg"
            style={{
              color: 'var(--sidebar-accent)',
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.25)'
            }}
          >
            {user.currentStreak} Day Streak
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="w-full py-2.5 px-3 rounded-[10px] flex items-center gap-2 text-sm font-medium transition-all"
          style={{
            background: 'var(--sidebar-user-bg)',
            border: '1px solid var(--sidebar-user-border)',
            color: 'var(--sidebar-text)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--sidebar-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--sidebar-user-bg)';
          }}
        >
          <span className="flex-shrink-0">{theme === 'dark' ? <Sun {...iconProps} /> : <Moon {...iconProps} />}</span>
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button
          onClick={logout}
          className="w-full py-2.5 px-3 rounded-[10px] flex items-center gap-2 text-sm font-semibold transition-all"
          style={{ color: 'var(--danger)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span className="flex-shrink-0"><LogOut {...iconProps} /></span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
