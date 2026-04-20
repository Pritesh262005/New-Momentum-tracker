import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import Avatar from '../../components/common/Avatar';
import RoleBadge from '../../components/common/RoleBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

const years = [1, 2, 3, 4];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
const defaultAssignedYearGroups = [{ year: 1, semesters: [1, 2] }];

export default function AdminUsers() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, variant: 'default', title: '', message: '', confirmLabel: 'Confirm', action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ role: '', department: '', year: '', semester: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STUDENT',
    rollNumber: '',
    department: '',
    year: 1,
    semester: 1,
    assignedYearGroups: defaultAssignedYearGroups
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, [pagination.page, filters.role, filters.department, filters.year, filters.semester]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users', {
        params: { page: pagination.page, limit: pagination.limit, ...filters }
      });
      const userList = response.data?.data || [];
      setUsers(Array.isArray(userList) ? userList : []);
      setPagination(prev => ({ ...prev, total: userList.length }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/admin/departments');
      const deptList = response.data?.data || [];
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (error) {
      setDepartments([]);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', formData);
      toast.success('User created successfully');
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        role: 'STUDENT',
        rollNumber: '',
        department: '',
        year: 1,
        semester: 1,
        assignedYearGroups: defaultAssignedYearGroups
      });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleRoleChange = (role) => {
    setFormData((prev) => ({
      ...prev,
      role,
      assignedYearGroups: ['TEACHER', 'HOD'].includes(role) ? prev.assignedYearGroups : defaultAssignedYearGroups
    }));
  };

  const updateAssignedGroup = (index, patch) => {
    setFormData((prev) => {
      const groups = prev.assignedYearGroups.slice();
      groups[index] = { ...groups[index], ...patch };
      return { ...prev, assignedYearGroups: groups };
    });
  };

  const addAssignedGroup = () => {
    setFormData((prev) => ({
      ...prev,
      assignedYearGroups: [...prev.assignedYearGroups, { year: 1, semesters: [1, 2] }]
    }));
  };

  const removeAssignedGroup = (index) => {
    setFormData((prev) => ({
      ...prev,
      assignedYearGroups: prev.assignedYearGroups.filter((_, i) => i !== index)
    }));
  };

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  const withConfirm = ({ variant = 'default', title, message, confirmLabel = 'Confirm', action }) => {
    setConfirmState({ open: true, variant, title, message, confirmLabel, action });
  };

  const closeConfirm = () => setConfirmState((p) => ({ ...p, open: false, action: null }));

  const doAction = async (fn) => {
    if (typeof fn !== 'function') return;
    try {
      setActionLoading(true);
      await fn();
      await fetchUsers();
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = () => {
    if (!selectedUser?._id) return;
    const willBlock = !!selectedUser.isActive;
    withConfirm({
      variant: willBlock ? 'warning' : 'default',
      title: willBlock ? 'Block User' : 'Unblock User',
      message: willBlock
        ? 'This will block the account and prevent login until unblocked.'
        : 'This will unblock the account and allow login again.',
      confirmLabel: willBlock ? 'Block' : 'Unblock',
      action: async () => {
        const { data } = await api.patch(`/admin/users/${selectedUser._id}/toggle`);
        if (data?.success) {
          toast.success(willBlock ? 'User blocked' : 'User unblocked');
          setSelectedUser((prev) => (prev ? { ...prev, isActive: !prev.isActive } : prev));
        } else {
          toast.error('Failed to update user status');
        }
        closeConfirm();
      }
    });
  };

  const handleResetPassword = () => {
    if (!selectedUser?._id) return;
    withConfirm({
      variant: 'warning',
      title: 'Reset Password',
      message: 'This will reset the user password to a temporary one. The user will be required to change it on next login.',
      confirmLabel: 'Reset',
      action: async () => {
        const { data } = await api.post(`/admin/users/${selectedUser._id}/reset-password`);
        if (data?.success) toast.success(data.message || 'Password reset');
        else toast.error('Failed to reset password');
        closeConfirm();
      }
    });
  };

  const handleDeactivate = () => {
    if (!selectedUser?._id) return;
    withConfirm({
      variant: 'danger',
      title: 'Deactivate User',
      message: 'This will deactivate the user account (soft delete). You can re-activate later from the user list.',
      confirmLabel: 'Deactivate',
      action: async () => {
        const { data } = await api.delete(`/admin/users/${selectedUser._id}`);
        if (data?.success) {
          toast.success(data.message || 'User deactivated');
          setSelectedUser((prev) => (prev ? { ...prev, isActive: false } : prev));
        } else {
          toast.error('Failed to deactivate user');
        }
        closeConfirm();
      }
    });
  };

  const handlePermanentDelete = () => {
    if (!selectedUser?._id) return;
    withConfirm({
      variant: 'danger',
      title: 'Delete Permanently',
      message: 'This will permanently delete the user account. This action cannot be undone.',
      confirmLabel: 'Delete',
      action: async () => {
        const { data } = await api.delete(`/admin/users/${selectedUser._id}/permanent`);
        if (data?.success) {
          toast.success(data.message || 'User deleted');
          setShowUserDetail(false);
          setSelectedUser(null);
        } else {
          toast.error(data?.message || 'Failed to delete user');
        }
        closeConfirm();
      }
    });
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{row.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'role', header: 'Role', render: (row) => <RoleBadge role={row.role} /> },
    { 
      key: 'department', 
      header: 'Department', 
      render: (row) => (
        <span style={{ color: 'var(--text-secondary)' }}>{row.department?.name || '-'}</span>
      )
    },
    { key: 'year', header: 'Year', render: (row) => row.role === 'STUDENT' ? `Year ${row.year || '-'}` : '-' },
    { key: 'semester', header: 'Semester', render: (row) => row.role === 'STUDENT' ? `S${row.semester || '-'}` : '-' }
  ];

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="p-8">
      <PageHeader
        title="Users"
        subtitle="Manage all users"
        breadcrumbs={['Dashboard', 'Users']}
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Create User
          </button>
        }
      />

      <div className="card p-6 mt-6">
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select className="input" value={filters.role} onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))}>
              <option value="">All Roles</option>
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="HOD">HOD</option>
            </select>
            <select className="input" value={filters.department} onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}>
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
            <select className="input" value={filters.year} onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value, semester: '' }))}>
              <option value="">All Years</option>
              {years.map((year) => <option key={year} value={year}>{`Year ${year}`}</option>)}
            </select>
            <select className="input" value={filters.semester} onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value }))}>
              <option value="">All Semesters</option>
              {semesters.map((semester) => <option key={semester} value={semester}>{`Semester ${semester}`}</option>)}
            </select>
          </div>

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
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState icon="👥" title="No users found" subtitle={searchQuery ? "Try a different search term" : "Create your first user to get started"} />
        ) : (
          <>
            <DataTable columns={columns} data={filteredUsers} loading={loading} rowKey="_id" onRowClick={handleRowClick} />
            <Pagination
              currentPage={pagination.page}
              totalPages={Math.ceil(pagination.total / pagination.limit)}
              onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            />
          </>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New User" size="md">
        <form onSubmit={handleCreateUser} className="space-y-5">
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Full Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Email Address</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Role</label>
            <select
              className="input"
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="HOD">HOD</option>
            </select>
          </div>
          {['STUDENT', 'TEACHER', 'HOD'].includes(formData.role) && (
            <div className="form-group">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                {formData.role === 'STUDENT' ? 'Roll No' : 'Roll/Staff No'}
              </label>
              <input
                type="text"
                className="input"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder={formData.role === 'STUDENT' ? 'Enter roll number' : 'Optional staff number'}
                required={formData.role === 'STUDENT'}
              />
            </div>
          )}
          <div className="form-group">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Department</label>
            <select
              className="input"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required={['STUDENT', 'TEACHER', 'HOD'].includes(formData.role)}
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
          {formData.role === 'STUDENT' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Year</label>
                <select
                  className="input"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value), semester: Number(e.target.value) * 2 - 1 })}
                >
                  {years.map((year) => <option key={year} value={year}>{`Year ${year}`}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Semester</label>
                <select
                  className="input"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                >
                  {semesters.filter((semester) => Math.ceil(semester / 2) === Number(formData.year)).map((semester) => (
                    <option key={semester} value={semester}>{`Semester ${semester}`}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {['TEACHER', 'HOD'].includes(formData.role) && (
            <div className="form-group">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Assigned Year Groups</label>
                <button type="button" className="btn-secondary btn-sm" onClick={addAssignedGroup}>+ Add Group</button>
              </div>
              <div className="space-y-3">
                {formData.assignedYearGroups.map((group, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <select className="input" value={group.year} onChange={(e) => updateAssignedGroup(index, { year: Number(e.target.value), semesters: [Number(e.target.value) * 2 - 1, Number(e.target.value) * 2] })}>
                        {years.map((year) => <option key={year} value={year}>{`Year ${year}`}</option>)}
                      </select>
                    </div>
                    <div className="col-span-7">
                      <select
                        className="input"
                        multiple
                        value={group.semesters.map(String)}
                        onChange={(e) => updateAssignedGroup(index, {
                          semesters: Array.from(e.target.selectedOptions).map((option) => Number(option.value))
                        })}
                      >
                        {semesters.filter((semester) => Math.ceil(semester / 2) === Number(group.year)).map((semester) => (
                          <option key={semester} value={semester}>{`Semester ${semester}`}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <button type="button" className="btn-danger btn-sm w-full" onClick={() => removeAssignedGroup(index)} disabled={formData.assignedYearGroups.length === 1}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create User
            </button>
          </div>
        </form>
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
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Department</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedUser.department?.name || '-'}</p>
              </div>
              {selectedUser.year ? (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Year</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{`Year ${selectedUser.year}`}</p>
                </div>
              ) : null}
              {selectedUser.semester ? (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Semester</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{`Semester ${selectedUser.semester}`}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Status</p>
                <span className={`badge ${selectedUser.isActive ? 'badge-green' : 'badge-red'}`}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {Array.isArray(selectedUser.assignedYearGroups) && selectedUser.assignedYearGroups.length > 0 ? (
                <div className="col-span-2">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Assigned Groups</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.assignedYearGroups.map((group, index) => (
                      <span key={index} className="badge badge-indigo">{`Y${group.year}: ${group.semesters?.map((semester) => `S${semester}`).join(', ') || 'All'}`}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedUser.class && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Class</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedUser.class?.name || '-'}</p>
                </div>
              )}
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

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" className="btn btn-secondary" onClick={handleResetPassword} disabled={actionLoading}>
                Reset Password
              </button>
              <button
                type="button"
                className={selectedUser.isActive ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={handleToggleActive}
                disabled={actionLoading}
              >
                {selectedUser.isActive ? 'Block' : 'Unblock'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeactivate} disabled={actionLoading}>
                Deactivate
              </button>
              <button type="button" className="btn btn-danger" onClick={handlePermanentDelete} disabled={actionLoading}>
                Delete Permanently
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmState.open}
        onClose={closeConfirm}
        onConfirm={() => doAction(confirmState.action)}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        loading={actionLoading}
        confirmLabel={confirmState.confirmLabel}
      />
    </div>
  );
}
