import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';
import api from '../../api/axios';

const years = [1, 2, 3, 4];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

const emptyQuestion = () => ({
  questionText: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  marks: 1,
  difficulty: 'MEDIUM',
  explanation: ''
});

export default function TeacherCreateTest() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [questionBankFile, setQuestionBankFile] = useState(null);
  const [pickCount, setPickCount] = useState(10);
  const [selectionMode, setSelectionMode] = useState('random');
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    targetYear: 1,
    targetSemester: 1,
    startTime: '',
    duration: 60,
    instructions: '',
    questions: [emptyQuestion()]
  });

  useEffect(() => {
    fetchSubjects();
  }, [formData.targetYear, formData.targetSemester]);

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/teacher/subjects', {
        params: { year: formData.targetYear, semester: formData.targetSemester }
      });
      const subjectList = data.success ? data.data : (data.subjects || []);
      setSubjects(Array.isArray(subjectList) ? subjectList : []);
    } catch (error) {
      toast.error('Failed to load subjects');
      setSubjects([]);
    }
  };

  const addQuestion = () => {
    setFormData((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }));
  };

  const updateQuestion = (index, field, value) => {
    setFormData((prev) => {
      const questions = prev.questions.slice();
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  };

  const updateOption = (qIndex, oIndex, value) => {
    setFormData((prev) => {
      const questions = prev.questions.slice();
      const options = questions[qIndex].options.slice();
      options[oIndex] = value;
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, questions };
    });
  };

  const clearOption = (qIndex, oIndex) => {
    updateOption(qIndex, oIndex, '');
  };

  const removeQuestion = (index) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
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

  const importFromPdf = async () => {
    if (!questionBankFile) {
      toast.error('Select a PDF question bank first');
      return;
    }

    try {
      setImporting(true);
      const payload = new FormData();
      payload.append('pdfFile', questionBankFile);
      payload.append('pickCount', String(pickCount));
      payload.append('selectionMode', selectionMode);

      const { data } = await api.post('/teacher/tests/import-question-bank', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const rows = data?.success && Array.isArray(data?.data?.questions) ? data.data.questions : [];
      if (rows.length === 0) {
        toast.error('No questions could be imported from this PDF');
        return;
      }

      setFormData((prev) => ({ ...prev, questions: rows }));
      toast.success(`Imported ${rows.length} questions from PDF (${data.data.parsedCount} parsed)`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to import questions from PDF');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Create Test"
        subtitle="Create a test manually with your own questions"
        breadcrumbs={[{ label: 'Dashboard', path: '/teacher' }, { label: 'Tests', path: '/teacher/tests' }, { label: 'Create' }]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold">Import Question Bank PDF</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Upload a PDF that already contains numbered MCQs, A-D options, the correct answer, and explanation. Example: 100 questions in PDF, pick 10 for this test.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="form-group md:col-span-2">
              <label>PDF File</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setQuestionBankFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="form-group">
              <label>Pick Questions</label>
              <input
                type="number"
                min="1"
                max="100"
                value={pickCount}
                onChange={(e) => setPickCount(parseInt(e.target.value, 10) || 10)}
              />
            </div>
            <div className="form-group">
              <label>Selection</label>
              <select value={selectionMode} onChange={(e) => setSelectionMode(e.target.value)}>
                <option value="random">Random</option>
                <option value="first">First N</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={importFromPdf} className="btn-primary" disabled={importing}>
              {importing ? 'Importing...' : 'Import Questions From PDF'}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Test Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="form-group">
              <label>Title</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Target Year</label>
              <select
                value={formData.targetYear}
                onChange={(e) => {
                  const targetYear = parseInt(e.target.value, 10);
                  const filteredSemesters = semesters.filter((semester) => Math.ceil(semester / 2) === targetYear);
                  setFormData((prev) => ({
                    ...prev,
                    targetYear,
                    targetSemester: filteredSemesters[0],
                    subject: ''
                  }));
                }}
                required
              >
                {years.map((year) => <option key={year} value={year}>Year {year}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Target Semester</label>
              <select
                value={formData.targetSemester}
                onChange={(e) => setFormData((prev) => ({ ...prev, targetSemester: parseInt(e.target.value, 10), subject: '' }))}
                required
              >
                {semesters
                  .filter((semester) => Math.ceil(semester / 2) === Number(formData.targetYear))
                  .map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Subject</label>
              <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required>
                <option value="">Select Subject</option>
                {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input type="number" min="5" max="180" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value, 10) || 60 })} required />
            </div>
          </div>

          <div className="form-group mt-4">
            <label>Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
          </div>

          <div className="form-group mt-4">
            <label>Instructions</label>
            <textarea value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} rows={3} placeholder="Attempt all questions. Read each option carefully." />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Questions</h3>
              <p className="text-sm text-[var(--text-secondary)]">Add and edit questions manually.</p>
            </div>
            <button type="button" onClick={addQuestion} className="btn-secondary btn-sm">+ Add Question</button>
          </div>

          <div className="space-y-6">
            {formData.questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 rounded-lg bg-[var(--bg-base)] space-y-4 border border-[var(--border)]">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold">Question {qIndex + 1}</h4>
                  {formData.questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qIndex)} className="text-sm text-[var(--danger)] hover:underline">Remove</button>
                  )}
                </div>
                <div className="form-group">
                  <label>Question</label>
                  <textarea value={q.questionText} onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)} required />
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Each question must have exactly 4 options. Options can be cleared and edited, but not deleted.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="form-group">
                      <div className="flex items-center justify-between mb-1">
                        <label>Option {oIndex + 1}</label>
                        <button
                          type="button"
                          onClick={() => clearOption(qIndex, oIndex)}
                          className="text-xs text-[var(--danger)] hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                      <input type="text" value={opt} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} required />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label>Correct Answer</label>
                    <select value={q.correctAnswer} onChange={(e) => updateQuestion(qIndex, 'correctAnswer', parseInt(e.target.value, 10))}>
                      <option value={0}>Option 1</option>
                      <option value={1}>Option 2</option>
                      <option value={2}>Option 3</option>
                      <option value={3}>Option 4</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Marks</label>
                    <input type="number" min="1" max="10" value={q.marks} onChange={(e) => updateQuestion(qIndex, 'marks', parseInt(e.target.value, 10) || 1)} required />
                  </div>
                  <div className="form-group">
                    <label>Difficulty</label>
                    <select value={q.difficulty} onChange={(e) => updateQuestion(qIndex, 'difficulty', e.target.value)}>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Explanation</label>
                  <textarea value={q.explanation || ''} onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)} rows={2} />
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
