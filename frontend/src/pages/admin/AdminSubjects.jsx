import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function AdminSubjects() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/admin/subjects');
      setSubjects(Array.isArray(data) ? data : data.subjects || []);
    } catch (error) {
      toast.error('Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="p-8">
      <PageHeader
        title="Subjects"
        subtitle="Manage subjects"
        breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Subjects' }]}
      />

      {subjects.length === 0 ? (
        <EmptyState icon="📚" title="No subjects yet" subtitle="Create your first subject" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {subjects.map((subject) => (
            <div key={subject._id} className="card p-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl mb-4">
                📚
              </div>
              <h3 className="text-lg font-bold mb-1">{subject.name}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{subject.code}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
