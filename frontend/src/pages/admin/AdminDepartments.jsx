import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import RoleBadge from '../../components/common/RoleBadge';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function AdminDepartments() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deptUsers, setDeptUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/admin/departments');
      const deptList = response.data?.data || [];
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (error) {
      toast.error('Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/departments', formData);
      toast.success('Department created successfully');
      setShowModal(false);
      setFormData({ name: '', code: '', description: '' });
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create department');
    }
  };

  const handleViewUsers = async (dept) => {
    setSelectedDept(dept);
    setShowUsersModal(true);
    try {
      const { data } = await api.get('/admin/users', { params: { department: dept._id } });
      const userList = data?.data || [];
      setDeptUsers(Array.isArray(userList) ? userList : []);
    } catch (error) {
      toast.error('Failed to load users');
      setDeptUsers([]);
    }
  };

  const handleViewUserDetail = (user) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  const filteredUsers = deptUsers.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usersByRole = {
    HOD: filteredUsers.filter(u => u.role === 'HOD'),
    TEACHER: filteredUsers.filter(u => u.role === 'TEACHER'),
    STUDENT: filteredUsers.filter(u => u.role === 'STUDENT')
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="p-8">
      <PageHeader
        title="Departments"
        subtitle="Manage departments"
        breadcrumbs={['Dashboard', 'Departments']}
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Create Department
          </button>
        }
      />

      {!departments || departments.length === 0 ? (
        <EmptyState icon="🏢" title="No departments yet" subtitle="Create your first department" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {departments && departments.map((dept) => (
            <div 
              key={dept._id} 
              className="card p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => handleViewUsers(dept)}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl mb-4">
                🏢
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{dept.name}</h3>
              <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{dept.code}</p>
              {dept.description && (
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{dept.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Department" size="md">
        <form onSubmit={handleCreateDepartment} className="space-y-5">
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Department Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Computer Science"
              required
            />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Department Code</label>
            <input
              type="text"
              className="input"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="CSE"
              required
            />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Description</label>
            <textarea
              className="input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the department"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Department
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showUsersModal} onClose={() => { setShowUsersModal(false); setSearchQuery(''); }} title={`${selectedDept?.name} - Users`} size="lg">
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              className="input pl-10"
              placeholder="Search by name, email, or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
          </div>

          {['HOD', 'TEACHER', 'STUDENT'].map(role => (
            usersByRole[role].length > 0 && (
              <div key={role}>
                <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-muted)' }}>
                  {role}S ({usersByRole[role].length})
                </h3>
                <div className="space-y-2">
                  {usersByRole[role].map(user => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                      onClick={() => handleViewUserDetail(user)}
                    >
                      <Avatar name={user.name} size="sm" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                      </div>
                      <RoleBadge role={user.role} />
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}

          {filteredUsers.length === 0 && (
            <EmptyState icon="👥" title="No users found" subtitle="Try a different search term" />
          )}
        </div>
      </Modal>

      <Modal isOpen={showUserDetail} onClose={() => setShowUserDetail(false)} title="User Details" size="md">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <Avatar name={selectedUser.name} size="lg" />
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedUser.name}</h3>
                <RoleBadge role={selectedUser.role} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Email</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedUser.email}</p>
              </div>
              {selectedUser.rollNumber && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Roll Number</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedUser.rollNumber}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>User ID</p>
                <p className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{selectedUser.userId}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Status</p>
                <span className={`badge ${selectedUser.isActive ? 'badge-green' : 'badge-red'}`}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {selectedUser.xpPoints !== undefined && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>XP Points</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedUser.xpPoints}</p>
                </div>
              )}
              {selectedUser.currentStreak !== undefined && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Current Streak</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedUser.currentStreak} days</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
