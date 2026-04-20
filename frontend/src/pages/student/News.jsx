import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NewsDetail from '../../components/news/NewsDetail';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function StudentNews() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data } = await api.get('/news');
      const newsList = data.success ? data.data : (Array.isArray(data) ? data : []);
      setNews(Array.isArray(newsList) ? newsList : []);
    } catch (error) {
      toast.error('Failed to load news');
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="News"
        subtitle="Latest updates and announcements"
        breadcrumbs={['Dashboard', 'News']}
      />

      {news && news.length === 0 ? (
        <EmptyState icon="📰" title="No news yet" subtitle="Check back later for updates" />
      ) : (
        <div className="space-y-4">
          {news && news.map((item) => (
            <div
              key={item._id}
              className="card p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => setSelectedDetail(item)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl flex-shrink-0">
                  📰
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{item.content}</p>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span>By {item.author?.name}</span>
                    <span>{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDetail && <NewsDetail news={selectedDetail} onClose={() => setSelectedDetail(null)} />}
    </div>
  );
}
