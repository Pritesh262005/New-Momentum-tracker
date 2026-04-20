import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div
      className="app-layout"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'transparent'
      }}
    >
      <Sidebar />
      <main
        className="main-content"
        style={{
          marginLeft: '240px',
          width: 'calc(100% - 240px)',
          minHeight: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
