import PageHeader from '../../components/common/PageHeader';
import DepartmentChat from '../../components/chat/DepartmentChat';

export default function TeacherChat() {
  return (
    <div className="page-container">
      <PageHeader
        title="Department Chat"
        subtitle="Discussion groups for your department"
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Chat' }]}
      />
      <DepartmentChat />
    </div>
  );
}

