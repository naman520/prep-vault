import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  Sparkles,
  Award,
} from 'lucide-react';
import { db } from '../db/db';
import type { TestResult } from '../types';

export const MockTestHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const results = await db.testResults.orderBy('completedAt').reverse().toArray();
      setHistory(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDeleteResult = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this mock test result from local history?')) {
      await db.testResults.delete(id);
      fetchHistory();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-slate-500">Loading test history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-500" />
            <span>Mock Test History</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review past scores, accuracy trends, and detailed explanations of completed tests.
          </p>
        </div>

        <button
          onClick={() => navigate('/mock-test')}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Mock Test</span>
        </button>
      </div>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Award className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
            No mock tests recorded yet
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Take your first timed mock exam to build realistic test temperament and track score improvements offline.
          </p>
          <button
            onClick={() => navigate('/mock-test')}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
          >
            Launch Mock Test
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((t) => (
            <div
              key={t.id}
              onClick={() => navigate(`/mock-test/result/${t.id}`)}
              className="cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{new Date(t.completedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {t.correctCount}/{t.totalQuestions} Correct
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {Math.floor(t.timeTakenSeconds / 60)}m {t.timeTakenSeconds % 60}s
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <span
                  className={`text-sm font-black px-3 py-1 rounded-xl ${
                    t.scorePercentage >= 70
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : t.scorePercentage >= 40
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                  }`}
                >
                  {t.scorePercentage}%
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDeleteResult(t.id, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Delete test result"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 pl-2">
                    <span>Review</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
