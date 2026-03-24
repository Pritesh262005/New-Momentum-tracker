import PageHeader from '../../components/common/PageHeader';
import DepartmentChat from '../../components/chat/DepartmentChat';

export default function StudentChat() {
  return (
    <div className="page-container">
      <PageHeader
        title="Department Chat"
        subtitle="Chat with your department groups"
        breadcrumbs={[{ label: 'Dashboard', path: '/student' }, { label: 'Chat' }]}
      />
      <DepartmentChat />
    </div>
  );
}

