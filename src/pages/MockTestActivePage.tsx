import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Send,
  Flag,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../db/db';
import { calculateTestResults } from '../utils/testEngine';
import type { ActiveTestSession, ActiveTestQuestion } from '../types';

export const MockTestActivePage: React.FC = () => {
  const navigate = useNavigate();

  const [session, setSession] = useState<ActiveTestSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load session from Dexie
  useEffect(() => {
    const loadSession = async () => {
      try {
        const active = await db.activeTestSession.get('current-test-session');
        if (!active || active.isCompleted) {
          navigate('/mock-test');
          return;
        }

        const now = Date.now();
        const diffSeconds = Math.max(0, Math.round((active.deadlineTimestamp - now) / 1000));

        if (diffSeconds <= 0) {
          // Time already expired before load
          handleCompleteSubmission(active);
          return;
        }

        setSession(active);
        setCurrentIndex(active.currentIndex || 0);
        setSecondsRemaining(diffSeconds);
      } catch (err) {
        console.error('Failed to load active test session:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [navigate]);

  // Submit test logic
  const handleCompleteSubmission = useCallback(async (activeSession: ActiveTestSession) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const endTime = Date.now();
      const resultsData = calculateTestResults(
        activeSession.questions,
        activeSession.startedAt,
        endTime,
        activeSession.title
      );

      const resultId = `result-${Date.now()}`;
      const finalResult = {
        id: resultId,
        ...resultsData,
      };

      // Save to Dexie test results
      await db.testResults.put(finalResult);

      // Mark session completed or clear it
      await db.activeTestSession.delete('current-test-session');

      navigate(`/mock-test/result/${resultId}`);
    } catch (err) {
      console.error('Failed to submit test:', err);
      setIsSubmitting(false);
    }
  }, [isSubmitting, navigate]);

  // Auto-countdown timer derived from saved deadline
  useEffect(() => {
    if (!session) return;

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((session.deadlineTimestamp - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleCompleteSubmission(session);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, handleCompleteSubmission]);

  if (loading || !session) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-slate-500">Loading test engine...</p>
        </div>
      </div>
    );
  }

  const currentQ: ActiveTestQuestion = session.questions[currentIndex];

  // Helper to update question in session and persist to Dexie
  const updateQuestionsState = async (
    updater: (prevQuestions: ActiveTestQuestion[]) => ActiveTestQuestion[]
  ) => {
    setSession((prev) => {
      if (!prev) return null;
      const updatedQuestions = updater([...prev.questions]);
      const updatedSession: ActiveTestSession = {
        ...prev,
        questions: updatedQuestions,
        currentIndex,
      };

      // Background persist to Dexie
      db.activeTestSession.put(updatedSession).catch(console.error);
      return updatedSession;
    });
  };

  // Option selection
  const handleSelectOption = (optionId: string) => {
    updateQuestionsState((questions) => {
      const q = questions[currentIndex];
      q.userAnswer = optionId;
      q.status = q.isMarkedForReview ? 'answered_and_marked' : 'answered';
      return questions;
    });
  };

  // Clear response
  const handleClearResponse = () => {
    updateQuestionsState((questions) => {
      const q = questions[currentIndex];
      q.userAnswer = undefined;
      q.status = q.isMarkedForReview ? 'marked_for_review' : 'unanswered';
      return questions;
    });
  };

  // Mark for review toggle
  const handleToggleMarkForReview = () => {
    updateQuestionsState((questions) => {
      const q = questions[currentIndex];
      q.isMarkedForReview = !q.isMarkedForReview;
      if (q.isMarkedForReview) {
        q.status = q.userAnswer ? 'answered_and_marked' : 'marked_for_review';
      } else {
        q.status = q.userAnswer ? 'answered' : 'unanswered';
      }
      return questions;
    });
  };

  // Navigate question index
  const goToQuestion = (index: number) => {
    if (index < 0 || index >= session.questions.length) return;

    // Mark current as unanswered if it was not_visited and no answer was chosen
    updateQuestionsState((questions) => {
      const q = questions[currentIndex];
      if (q.status === 'not_visited' && !q.userAnswer) {
        q.status = 'unanswered';
      }
      return questions;
    });

    setCurrentIndex(index);
  };

  // Format timer
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  // Calculate palette stats
  const answeredCount = session.questions.filter((q) => q.userAnswer !== undefined && q.userAnswer !== '').length;
  const markedCount = session.questions.filter((q) => q.isMarkedForReview).length;
  const unansweredCount = session.questions.length - answeredCount;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Test Header Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {session.title}
          </h1>
          <p className="text-xs text-slate-500">
            Total {session.totalQuestions} Questions • Single Best Answer
          </p>
        </div>

        {/* Timer Display */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-black tracking-wider font-mono border ${
              secondsRemaining < 120
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Test</span>
          </button>
        </div>
      </div>

      {/* Main Examination Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Panel (Left 3 columns) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            {/* Question Info Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 bg-slate-50/70 dark:bg-slate-850/50">
              <span className="text-xs font-black uppercase tracking-wider font-mono px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Question {currentIndex + 1}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                  {currentQ.originalQuestion.difficulty}
                </span>
                {currentQ.isMarkedForReview && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <Flag className="w-3 h-3 fill-purple-600" />
                    Marked
                  </span>
                )}
              </div>
            </div>

            {/* Question Statement & Options */}
            <div className="p-6 sm:p-8 space-y-6">
              <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-white leading-relaxed">
                {currentQ.originalQuestion.question}
              </p>

              {/* Shuffled Options */}
              <div className="space-y-3">
                {currentQ.shuffledOptions.map((opt) => {
                  const isSelected = currentQ.userAnswer === opt.id;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`w-full text-left flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span className="text-sm font-medium">{opt.text}</span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons: Clear, Mark For Review, Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleMarkForReview}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                      currentQ.isMarkedForReview
                        ? 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{currentQ.isMarkedForReview ? 'Unmark Review' : 'Mark for Review'}</span>
                  </button>

                  {currentQ.userAnswer && (
                    <button
                      onClick={handleClearResponse}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToQuestion(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={() => {
                      if (currentIndex === session.questions.length - 1) {
                        setShowSubmitModal(true);
                      } else {
                        goToQuestion(currentIndex + 1);
                      }
                    }}
                    className="flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition"
                  >
                    <span>{currentIndex === session.questions.length - 1 ? 'Review & Submit' : 'Save & Next'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar (Right 1 column) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Question Palette
            </h3>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">Not Visited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-purple-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">Marked ({markedCount})</span>
              </div>
            </div>

            {/* Interactive Grid of Question Numbers */}
            <div className="mt-4 grid grid-cols-5 gap-2">
              {session.questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const hasAnswer = q.userAnswer !== undefined && q.userAnswer !== '';
                const isMarked = q.isMarkedForReview;

                let badgeStyle = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                if (hasAnswer && isMarked) {
                  badgeStyle = 'bg-blue-600 text-white';
                } else if (hasAnswer) {
                  badgeStyle = 'bg-emerald-600 text-white font-bold';
                } else if (isMarked) {
                  badgeStyle = 'bg-purple-600 text-white';
                } else if (q.status === 'unanswered') {
                  badgeStyle = 'bg-amber-500 text-white font-bold';
                }

                return (
                  <button
                    key={q.questionId}
                    onClick={() => goToQuestion(idx)}
                    className={`h-9 w-full rounded-xl text-xs font-mono font-bold transition flex items-center justify-center relative ${badgeStyle} ${
                      isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : 'hover:opacity-80'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Submit Test CTA */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="mt-6 w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 py-2.5 text-xs font-bold shadow-xs transition"
            >
              Submit Entire Test
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Test Submission
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to finalize and grade your test?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-center border border-slate-100 dark:border-slate-800">
              <div>
                <span className="block text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {answeredCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Answered</span>
              </div>
              <div>
                <span className="block text-lg font-black text-amber-500">
                  {unansweredCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Unanswered</span>
              </div>
              <div>
                <span className="block text-lg font-black text-purple-600 dark:text-purple-400">
                  {markedCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Marked</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Back to Test
              </button>
              <button
                onClick={() => handleCompleteSubmission(session)}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-semibold transition"
              >
                {isSubmitting ? 'Grading...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
