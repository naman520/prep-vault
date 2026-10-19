import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  LayoutDashboard,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { db } from '../db/db';
import type { TestResult } from '../types';

export const MockTestResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadResult = async () => {
      try {
        if (!id) return;
        const data = await db.testResults.get(id);
        if (data) {
          setResult(data);

          // Confetti for score >= 70%
          if (data.scorePercentage >= 70) {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            });
          }
        }
      } catch (err) {
        console.error('Failed to load test result:', err);
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-slate-500">Calculating your test score...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
        <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
          Result not found
        </h2>
        <button
          onClick={() => navigate('/mock-test')}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
        >
          Back to Mock Tests
        </button>
      </div>
    );
  }

  const toggleExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const filteredQuestions = result.questionsSnapshot.filter((q) => {
    if (reviewFilter === 'correct') return q.isCorrect;
    if (reviewFilter === 'incorrect') return q.userAnswer && !q.isCorrect;
    if (reviewFilter === 'unanswered') return !q.userAnswer;
    return true;
  });

  const accuracyRate =
    result.totalQuestions - result.unansweredCount > 0
      ? Math.round((result.correctCount / (result.totalQuestions - result.unansweredCount)) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Banner / Score Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="inline-block text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Exam Complete
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {result.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Completed on {new Date(result.completedAt).toLocaleString()}
            </p>
          </div>

          {/* Big Score Ring */}
          <div className="flex flex-col items-center">
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-3xl border-4 text-center font-black ${
                result.scorePercentage >= 75
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : result.scorePercentage >= 45
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              <div>
                <span className="text-2xl font-black">{result.scorePercentage}%</span>
                <span className="block text-[9px] uppercase tracking-wider font-bold">Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase">
              <CheckCircle2 className="w-4 h-4" />
              <span>Correct</span>
            </div>
            <p className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
              {result.correctCount}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              out of {result.totalQuestions} questions
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-xs font-bold uppercase">
              <XCircle className="w-4 h-4" />
              <span>Incorrect</span>
            </div>
            <p className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">
              {result.incorrectCount}
            </p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
              mistakes to review
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase">
              <HelpCircle className="w-4 h-4" />
              <span>Unanswered</span>
            </div>
            <p className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
              {result.unansweredCount}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
              skipped questions
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase">
              <Clock className="w-4 h-4" />
              <span>Time Spent</span>
            </div>
            <p className="text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-1">
              {Math.floor(result.timeTakenSeconds / 60)}m {result.timeTakenSeconds % 60}s
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
              {accuracyRate}% answer accuracy
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/mock-test')}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Take Another Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* Question-by-Question Review Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Detailed Question Review</span>
            <span className="text-xs font-normal text-slate-500">
              ({filteredQuestions.length} shown)
            </span>
          </h2>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(['all', 'correct', 'incorrect', 'unanswered'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setReviewFilter(filter)}
                className={`px-3 py-1 rounded-lg capitalize transition ${
                  reviewFilter === filter
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Question List */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const isExpanded = expandedQuestions[q.questionId] !== false; // Default expanded

            return (
              <div
                key={q.questionId}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
              >
                {/* Header */}
                <div
                  onClick={() => toggleExpand(q.questionId)}
                  className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850/50 transition border-b border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                        q.isCorrect
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : q.userAnswer
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {q.questionText}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        q.isCorrect
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : q.userAnswer
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {q.isCorrect ? 'Correct' : q.userAnswer ? 'Incorrect' : 'Skipped'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {q.questionText}
                    </p>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt) => {
                        const isCorrectOpt = opt.id === q.correctAnswer;
                        const isUserChoice = opt.id === q.userAnswer;

                        let style = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
                        if (isCorrectOpt) {
                          style = 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20';
                        } else if (isUserChoice && !isCorrectOpt) {
                          style = 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/50 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-medium ${style}`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                                  isCorrectOpt
                                    ? 'bg-emerald-600 text-white'
                                    : isUserChoice
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                            </div>

                            {isCorrectOpt && (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase px-1.5 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-950">
                                Correct
                              </span>
                            )}
                            {isUserChoice && !isCorrectOpt && (
                              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase px-1.5 py-0.5 rounded-sm bg-rose-100 dark:bg-rose-950">
                                Your Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Step-by-Step Explanation */}
                    <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Explanation:</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
