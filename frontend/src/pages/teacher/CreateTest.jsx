import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

export default function TeacherCreateTest() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    startTime: '',
    duration: 60,
    questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 }]
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/teacher/subjects');
      const subjectList = data.success ? data.data : (data.subjects || []);
      setSubjects(Array.isArray(subjectList) ? subjectList : []);
    } catch (error) {
      toast.error('Failed to load subjects');
      setSubjects([]);
    }
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 }]
    });
  };

  const updateQuestion = (index, field, value) => {
    const questions = [...formData.questions];
    questions[index][field] = value;
    setFormData({ ...formData, questions });
  };

  const updateOption = (qIndex, oIndex, value) => {
    const questions = [...formData.questions];
    questions[qIndex].options[oIndex] = value;
    setFormData({ ...formData, questions });
  };

  const removeQuestion = (index) => {
    setFormData({ ...formData, questions: formData.questions.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/teacher/tests', formData);
      toast.success('Test created successfully');
      navigate('/teacher/tests');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Create Test"
        subtitle="Create a new test"
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Tests', path: '/teacher/tests' }, { label: 'Create' }]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Test Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label>Title</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} required />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Questions</h3>
            <button type="button" onClick={addQuestion} className="btn-secondary btn-sm">+ Add Question</button>
          </div>

          <div className="space-y-6">
            {formData.questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 rounded-lg bg-[var(--bg-base)] space-y-4">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold">Question {qIndex + 1}</h4>
                  {formData.questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qIndex)} className="text-sm text-[var(--danger)] hover:underline">Remove</button>
                  )}
                </div>
                <div className="form-group">
                  <label>Question</label>
                  <textarea value={q.question} onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="form-group">
                      <label>Option {oIndex + 1}</label>
                      <input type="text" value={opt} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} required />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label>Correct Answer</label>
                    <select value={q.correctAnswer} onChange={(e) => updateQuestion(qIndex, 'correctAnswer', parseInt(e.target.value))}>
                      <option value={0}>Option 1</option>
                      <option value={1}>Option 2</option>
                      <option value={2}>Option 3</option>
                      <option value={3}>Option 4</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Marks</label>
                    <input type="number" value={q.marks} onChange={(e) => updateQuestion(qIndex, 'marks', parseInt(e.target.value))} required />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/teacher/tests')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <LoadingSpinner /> : 'Create Test'}
          </button>
        </div>
      </form>
    </div>
  );
}
