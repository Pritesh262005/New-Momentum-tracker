import { useEffect, useMemo, useState, useRef } from 'react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';
import api from '../../api/axios';

export default function StudentTests() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [filter, setFilter] = useState('available');
  const [attemptState, setAttemptState] = useState({
    open: false,
    test: null,
    attemptId: '',
    questions: [],
    answers: {},
    duration: 0,
    startedAt: null,
    submitting: false
  });
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const isSubmittingRef = useRef(false);
  const attemptIdRef = useRef('');
  const submitAttemptRef = useRef(null);

  useEffect(() => {
    attemptIdRef.current = attemptState.attemptId;
  }, [attemptState.attemptId]);

  useEffect(() => {
    fetchTests();
  }, [filter]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/student/tests', { params: { status: filter } });
      const testData = response.data?.data || [];
      setTests(Array.isArray(testData) ? testData : []);
    } catch (error) {
      toast.error('Failed to load tests');
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const remainingSeconds = useMemo(() => {
    if (!attemptState.open || !attemptState.startedAt || !attemptState.duration) return 0;
    const elapsed = Math.floor((Date.now() - new Date(attemptState.startedAt).getTime()) / 1000);
    return Math.max(0, attemptState.duration * 60 - elapsed);
  }, [attemptState]);

  useEffect(() => {
    if (!attemptState.open || !attemptState.startedAt || !attemptState.duration) return undefined;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(attemptState.startedAt).getTime()) / 1000);
      if (elapsed >= attemptState.duration * 60) {
        clearInterval(interval);
        if (submitAttemptRef.current) submitAttemptRef.current(true);
      } else {
        setAttemptState((prev) => ({ ...prev }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [attemptState.open, attemptState.startedAt, attemptState.duration]);

  const getTestStatus = (test) => {
    const now = new Date();
    const start = new Date(test.startDateTime);
    const end = new Date(test.endDateTime);
    if (now < start) return { label: 'Upcoming', color: 'amber' };
    if (now > end) return { label: 'Ended', color: 'gray' };
    return { label: 'Active', color: 'green' };
  };

  const startAttempt = async (test) => {
    try {
      const { data } = await api.post(`/mcq/${test._id}/start`);
      const payload = data?.data || {};
      setAttemptState({
        open: true,
        test,
        attemptId: payload.attemptId,
        questions: Array.isArray(payload.questions) ? payload.questions : [],
        answers: {},
        duration: payload.duration || test.duration || 0,
        startedAt: new Date().toISOString(),
        submitting: false
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start test');
    }
  };

  const saveAnswer = async (questionIndex, selectedOption) => {
    setAttemptState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionIndex]: selectedOption }
    }));
    try {
      await api.patch(`/mcq/attempt/${attemptState.attemptId}/answer`, {
        questionIndex,
        selectedOption,
        timeTaken: 0
      });
    } catch (error) {
      toast.error('Failed to save answer');
    }
  };

  const submitAttempt = async (autoTimeout = false, forcedMessage = '') => {
    const currentId = attemptState.attemptId || attemptIdRef.current;
    if (!currentId || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    try {
      setAttemptState((prev) => ({ ...prev, submitting: true }));
      const url = autoTimeout
        ? `/mcq/attempt/${currentId}/timeout`
        : `/mcq/attempt/${currentId}/submit`;
      await api.post(url);
      
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }

      setAttemptState({
        open: false,
        test: null,
        attemptId: '',
        questions: [],
        answers: {},
        duration: 0,
        startedAt: null,
        submitting: false
      });
      setShowSubmitConfirm(false);
      
      if (forcedMessage) {
        toast.error(forcedMessage);
      } else {
        toast.success(autoTimeout ? 'Time is over. Test submitted automatically.' : 'Test submitted successfully');
      }
      
      fetchTests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit test');
      setAttemptState((prev) => ({ ...prev, submitting: false }));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  useEffect(() => {
    submitAttemptRef.current = submitAttempt;
  }, [submitAttempt]);

  // Anti-Cheat System
  useEffect(() => {
    if (!attemptState.open) return;

    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(err => console.log('Error attempting to enable fullscreen:', err));
    }

    const handleVisibilityChange = () => {
      if (document.hidden && attemptIdRef.current && !isSubmittingRef.current) {
        if (submitAttemptRef.current) {
          submitAttemptRef.current(true, 'Tab switching detected! Test auto-submitted.');
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && attemptIdRef.current && !isSubmittingRef.current) {
        if (submitAttemptRef.current) {
          submitAttemptRef.current(true, 'Exited Fullscreen mode! Test auto-submitted.');
        }
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.warning('Right-click is disabled during the test.');
    };

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast.warning('Keyboard shortcuts are disabled during the test.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [attemptState.open]);

  const timerLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="page-container">
      <PageHeader
        title="Tests"
        subtitle="Attend department tests created from your unit materials"
        breadcrumbs={['Dashboard', 'Tests']}
      />

      <div className="card p-6 mb-6">
        <div className="flex gap-3">
          <button onClick={() => setFilter('available')} className={filter === 'available' ? 'btn-primary' : 'btn-secondary'}>Available</button>
          <button onClick={() => setFilter('completed')} className={filter === 'completed' ? 'btn-primary' : 'btn-secondary'}>Completed</button>
        </div>
      </div>

      {tests.length === 0 ? (
        <EmptyState icon="📝" title="No tests found" subtitle={`No ${filter} tests`} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const status = getTestStatus(test);
            const canStart = filter === 'available' && status.label === 'Active' && test.attemptStatus !== 'SUBMITTED';
            return (
              <div key={test._id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl">
                    📝
                  </div>
                  <span className={`badge badge-${status.color}`}>{status.label}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{test.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{test.subject?.name}</p>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>⏰</span>
                    <span>{formatDateTime(test.startDateTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>⏱️</span>
                    <span>{test.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>❓</span>
                    <span>{test.questions?.length || 0} questions</span>
                  </div>
                </div>
                {filter === 'completed' ? (
                  <div className="badge badge-green">Completed</div>
                ) : canStart ? (
                  <button className="btn-primary w-full" onClick={() => startAttempt(test)}>Start Test</button>
                ) : (
                  <div className="badge badge-gray">{test.attemptStatus === 'SUBMITTED' ? 'Already Submitted' : 'Unavailable'}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={attemptState.open}
        onClose={() => setShowSubmitConfirm(true)}
        title={attemptState.test?.title || 'Attempt Test'}
        size="xl"
      >
        {!attemptState.test ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-5 select-none">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
              <div>
                <div className="font-semibold">{attemptState.test.subject?.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{attemptState.questions.length} questions</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[var(--text-muted)]">Time Left</div>
                <div className="text-2xl font-bold">{timerLabel}</div>
              </div>
            </div>

            {attemptState.questions.map((question, index) => (
              <div key={`${question.index}-${index}`} className="rounded-xl border border-[var(--border)] p-4 bg-[var(--bg-base)]">
                <div className="font-semibold mb-3">{index + 1}. {question.questionText}</div>
                <div className="space-y-2">
                  {(question.options || []).map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${question.index}`}
                        checked={attemptState.answers[question.index] === optionIndex}
                        onChange={() => saveAnswer(question.index, optionIndex)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowSubmitConfirm(true)}>
                Submit
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => submitAttempt(false)}
                disabled={attemptState.submitting}
              >
                {attemptState.submitting ? 'Submitting...' : 'Finish Test'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={() => submitAttempt(false)}
        title="Submit Test"
        message="This will submit your current answers. Unanswered questions will remain blank."
        confirmLabel="Submit"
        variant="warning"
        loading={attemptState.submitting}
      />
    </div>
  );
}
