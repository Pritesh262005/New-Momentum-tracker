import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Sidebar />
      <main style={{ marginLeft: '240px', flex: 1, minHeight: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
