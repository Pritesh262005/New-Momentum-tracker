import PageHeader from '../../components/common/PageHeader';
import DepartmentChat from '../../components/chat/DepartmentChat';

export default function HODChat() {
  return (
    <div className="page-container">
      <PageHeader
        title="Department Chat"
        subtitle="Create and manage department discussion groups"
        breadcrumbs={[{ label: 'Dashboard', path: '/hod' }, { label: 'Chat' }]}
      />
      <DepartmentChat />
    </div>
  );
}

