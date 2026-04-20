import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import { downloadPdf } from '../../utils/download';
import api from '../../api/axios';

export default function NewsDetail({ news, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [detail, setDetail] = useState(news);

  const loadNewsDetail = async () => {
    if (!news?._id) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/news/${news._id}`);
      const newsData = data.success ? data.data : data;
      setDetail(newsData);
    } catch (error) {
      toast.error('Failed to load news details');
      setDetail(news);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNewsDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [news?._id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    const content = commentText.trim();
    if (!content) return;

    try {
      setSubmitting(true);
      await api.post(`/news/${news._id}/comment`, { content });
      setCommentText('');
      toast.success('Comment added');
      await loadNewsDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (index) => {
    try {
      const att = (detail?.attachments || [])[index];
      await downloadPdf(`/news/${news._id}/attachments/${index}`, att?.fileName || `attachment-${index + 1}.pdf`);
    } catch (e) {
      toast.error('Failed to download attachment');
    }
  };

  if (!news) return null;

  return (
    <Modal isOpen={true} title={detail?.title || news.title} onClose={onClose} size="lg">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] pb-4 border-b border-[var(--border)]">
            <span>By {detail?.author?.name}</span>
            <span>{formatDateTime(detail?.createdAt)}</span>
          </div>

          <p className="text-[var(--text-primary)] whitespace-pre-wrap">{detail?.content}</p>

          {(detail?.attachments || []).length > 0 && (
            <div className="pt-2 border-t border-[var(--border)]">
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Attachments
              </h4>
              <div className="space-y-2">
                {detail.attachments.map((a, idx) => (
                  <div key={`${a.fileName}-${idx}`} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--bg-base)]">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {a.fileName || `Attachment ${idx + 1}`}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">{a.fileSize ? `${Math.round(a.fileSize / 1024)} KB` : ''}</div>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDownload(idx)}>
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--border)]">
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Comments
            </h4>

            {detail?.commentsEnabled && !detail?.commentsLocked ? (
              <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                <input
                  type="text"
                  className="input flex-1"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  style={{
                    color: 'var(--text-primary)',
                    background: 'var(--bg-base)',
                    borderColor: 'var(--border)'
                  }}
                />
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </form>
            ) : (
              <p className="text-sm mb-4 text-[var(--text-muted)]">Comments are disabled for this news.</p>
            )}

            {(detail?.comments || []).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {detail.comments.map((comment) => (
                  <div key={comment._id} className="p-3 rounded-lg bg-[var(--bg-base)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {comment.author?.name || 'User'}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
