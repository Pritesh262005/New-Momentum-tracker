import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const isTeacherLike = (role) => ['TEACHER', 'HOD', 'PROFESSOR'].includes(role);

export default function DepartmentChat() {
  const toast = useToast();
  const { user } = useAuth();

  const canCreateGroups = isTeacherLike(user?.role);

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const listRef = useRef(null);

  const selectedGroup = useMemo(() => groups.find((g) => g._id === selectedId) || null, [groups, selectedId]);

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const { data } = await api.get('/chat/groups');
      const rows = data?.success && Array.isArray(data.data) ? data.data : [];
      setGroups(rows);

      if (!selectedId && rows.length > 0) setSelectedId(rows[0]._id);
      if (selectedId && rows.every((g) => g._id !== selectedId) && rows.length > 0) setSelectedId(rows[0]._id);
      if (rows.length === 0) setSelectedId('');
    } catch (e) {
      toast.error('Failed to load chat groups');
      setGroups([]);
      setSelectedId('');
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchMessages = async (groupId, { silent = false } = {}) => {
    if (!groupId) {
      setMessages([]);
      return;
    }

    try {
      if (!silent) setLoadingMessages(true);
      const { data } = await api.get(`/chat/groups/${groupId}/messages?limit=100`);
      setMessages(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      if (!silent) toast.error('Failed to load messages');
      setMessages([]);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMessages(selectedId);
    const t = selectedId ? setInterval(() => fetchMessages(selectedId, { silent: true }), 3000) : null;
    return () => {
      if (t) clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!selectedId) return;
    if (!content) return;

    try {
      setSending(true);
      await api.post(`/chat/groups/${selectedId}/messages`, { text: content });
      setText('');
      await fetchMessages(selectedId, { silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return toast.warning('Enter group name');

    try {
      setCreating(true);
      const { data } = await api.post('/chat/groups', { name });
      const created = data?.success ? data.data : null;
      toast.success('Group created');
      setShowCreate(false);
      setNewGroupName('');
      await fetchGroups();
      if (created?._id) setSelectedId(created._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const audienceBadge = (aud) => {
    if (aud === 'STUDENTS') return { text: 'Students', cls: 'badge badge-cyan' };
    if (aud === 'TEACHERS') return { text: 'Teachers', cls: 'badge badge-violet' };
    return { text: 'All', cls: 'badge badge-indigo' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="min-w-0">
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Groups</div>
            <div className="text-xs text-[var(--text-muted)]">Department discussions</div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={fetchGroups} disabled={loadingGroups}>Refresh</button>
            {canCreateGroups && (
              <button type="button" className="btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Group</button>
            )}
          </div>
        </div>

        {loadingGroups ? (
          <LoadingSpinner />
        ) : groups.length === 0 ? (
          <EmptyState icon="💬" title="No groups" subtitle="Your department groups will appear here" />
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const active = g._id === selectedId;
              const badge = audienceBadge(g.audience);
              return (
                <button
                  key={g._id}
                  type="button"
                  onClick={() => setSelectedId(g._id)}
                  className="w-full text-left p-3 rounded-xl border transition-colors"
                  style={{
                    background: active ? 'rgba(99,102,241,0.10)' : 'var(--bg-base)',
                    borderColor: active ? 'rgba(99,102,241,0.35)' : 'var(--border)'
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{g.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{g.isSystem ? 'System group' : 'Custom group'}</div>
                    </div>
                    <span className={badge.cls}>{badge.text}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-5 flex flex-col min-h-[520px]">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div className="min-w-0">
            <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {selectedGroup?.name || 'Select a group'}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {selectedGroup ? 'Chat with your department' : 'Choose a group to view messages'}
            </div>
          </div>
          {selectedGroup && (
            <span className={audienceBadge(selectedGroup.audience).cls}>
              {audienceBadge(selectedGroup.audience).text}
            </span>
          )}
        </div>

        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon="💬" title="No group selected" subtitle="Pick a group from the left" />
          </div>
        ) : loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div ref={listRef} className="flex-1 overflow-y-auto py-4 space-y-3">
              {messages.length === 0 ? (
                <EmptyState icon="🗨️" title="No messages" subtitle="Say hello to start the discussion" />
              ) : (
                messages.map((m) => {
                  const mine = m?.sender?._id === user?._id;
                  return (
                    <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[78%] p-3 rounded-xl border"
                        style={{
                          background: mine ? 'rgba(99,102,241,0.12)' : 'var(--bg-base)',
                          borderColor: mine ? 'rgba(99,102,241,0.25)' : 'var(--border)'
                        }}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {mine ? 'You' : (m?.sender?.name || 'User')}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">{formatDateTime(m?.createdAt)}</div>
                        </div>
                        <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{m.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={send} className="pt-3 border-t border-[var(--border)] flex gap-2">
              <input
                className="input flex-1"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
              />
              <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>

      {showCreate && (
        <Modal isOpen={true} onClose={() => setShowCreate(false)} title="Create Group" size="md">
          <form onSubmit={createGroup} className="space-y-4">
            <div className="form-group">
              <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Group Name</label>
              <input className="input" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} required />
            </div>
            <p className="text-xs text-[var(--text-muted)]">New groups are teacher-only within your department.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
