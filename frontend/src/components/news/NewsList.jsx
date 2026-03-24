import { useState, useEffect } from 'react';
import NewsCard from './NewsCard';
import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function NewsList({ onNewsClick }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data } = await api.get('/news');
      setNews(data);
    } catch (error) {
      showToast('Failed to load news', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  if (news.length === 0) {
    return <EmptyState icon="📰" title="No news yet" subtitle="Check back later for updates" />;
  }

  return (
    <div className="space-y-4">
      {news.map((item) => (
        <NewsCard key={item._id} news={item} onClick={() => onNewsClick?.(item)} />
      ))}
    </div>
  );
}
