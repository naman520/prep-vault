import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  GraduationCap,
  Layers,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  BookmarkCheck,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { db } from '../db/db';
import { CATEGORIES } from '../data/categories';
import { useTheme } from '../context/ThemeContext';
import type { TestResult, PracticeProgress, PracticeSessionState } from '../types';

export const DashboardPage: React.FC = () => {
  const { brandName } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [testsCompleted, setTestsCompleted] = useState(0);
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [recentSession, setRecentSession] = useState<PracticeSessionState | null>(null);
  const [weakTopics, setWeakTopics] = useState<Array<{ name: string; categoryName: string; accuracy: number; total: number; catId: string; topicId: string }>>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const qCount = await db.questions.count();
        setTotalQuestions(qCount);

        const bCount = await db.bookmarks.count();
        setBookmarkCount(bCount);

        const progressList: PracticeProgress[] = await db.practiceProgress.toArray();
        const attempted = progressList.length;
        const correct = progressList.filter((p) => p.isCorrect).length;
        setAttemptedCount(attempted);
        setCorrectCount(correct);

        // Find weak topics (<60% accuracy with at least 2 attempts)
        const topicStats: Record<string, { total: number; correct: number; catId: string; topicId: string }> = {};
        for (const p of progressList) {
          const key = `${p.categoryId}:${p.topicId}`;
          if (!topicStats[key]) {
            topicStats[key] = { total: 0, correct: 0, catId: p.categoryId, topicId: p.topicId };
          }
          topicStats[key].total++;
          if (p.isCorrect) topicStats[key].correct++;
        }

        const calculatedWeakTopics = Object.values(topicStats)
          .filter((s) => s.total >= 2 && (s.correct / s.total) < 0.65)
          .map((s) => {
            const cat = CATEGORIES.find((c) => c.id === s.catId);
            const topic = cat?.topics.find((t) => t.id === s.topicId);
            return {
              name: topic?.name || s.topicId,
              categoryName: cat?.name || s.catId,
              accuracy: Math.round((s.correct / s.total) * 100),
              total: s.total,
              catId: s.catId,
              topicId: s.topicId,
            };
          })
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 3);
        setWeakTopics(calculatedWeakTopics);

        // Recent Tests
        const tests = await db.testResults.orderBy('completedAt').reverse().limit(3).toArray();
        setRecentTests(tests);
        const tCount = await db.testResults.count();
        setTestsCompleted(tCount);

        // Latest practice session
        const sessions = await db.practiceSessions.orderBy('updatedAt').reverse().limit(1).toArray();
        if (sessions.length > 0) {
          setRecentSession(sessions[0]);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const overallAccuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

  const handleStartDailyPractice = async () => {
    // Pick 10 random questions from across categories
    navigate('/practice?mode=daily');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading your local progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold uppercase tracking-wider text-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            100% Offline-First Learning
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome to {brandName}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-indigo-100 leading-relaxed">
            Practice Quantitative Aptitude, Logical Reasoning, Verbal Ability, Static GK, and Technical Interview questions anywhere — with or without internet.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/mock-test')}
              className="flex items-center gap-2 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2.5 text-sm font-semibold shadow-md transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Take a Mock Test</span>
            </button>
            <button
              onClick={handleStartDailyPractice}
              className="flex items-center gap-2 rounded-xl bg-indigo-600/40 hover:bg-indigo-600/60 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-xs transition active:scale-95"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Daily Practice (10 Qs)</span>
            </button>
            <Link
              to="/categories"
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-100 hover:text-white px-2 py-1 transition"
            >
              <span>Explore Topics</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-8 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-32 -top-10 w-48 h-48 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />
      </div>

      {/* Real Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Offline Bank
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {totalQuestions}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Original verified questions
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Practiced
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {attemptedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {correctCount} correct answers
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Accuracy
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {overallAccuracy}%
          </p>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-violet-600 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, overallAccuracy)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mock Tests
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {testsCompleted}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Completed test sessions
          </p>
        </div>
      </div>

      {/* Resume Practice or Quick Jump */}
      {recentSession && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Continue Practice Session
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You were practicing{' '}
                <strong className="text-indigo-600 dark:text-indigo-400 capitalize">
                  {recentSession.topicId || recentSession.categoryId}
                </strong>
                . Resume from question {recentSession.currentIndex + 1}.
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              navigate(
                `/practice?category=${recentSession.categoryId}${
                  recentSession.topicId ? `&topic=${recentSession.topicId}` : ''
                }`
              )
            }
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold transition shrink-0"
          >
            Resume Practice
          </button>
        </div>
      )}

      {/* Main Content Layout: Categories & Weak Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Top Categories */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <span>Core Learning Categories</span>
            </h2>
            <Link
              to="/categories"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All 6 Categories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CATEGORIES.slice(0, 4).map((cat) => (
              <div
                key={cat.id}
                onClick={() => navigate(`/categories#${cat.id}`)}
                className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr ${cat.color} text-white shadow-xs`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {cat.topics.length} Subtopics
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  <span>Browse Topics</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Weak Topics & Recent Tests */}
        <div className="space-y-6">
          {/* Weak Topics Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Areas for Improvement</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Topics where accuracy is below 65% based on local practice attempts.
            </p>

            {weakTopics.length > 0 ? (
              <div className="mt-4 space-y-3">
                {weakTopics.map((wt, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{wt.name}</p>
                      <p className="text-[10px] text-slate-500">{wt.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        {wt.accuracy}% acc
                      </span>
                      <button
                        onClick={() => navigate(`/practice?category=${wt.catId}&topic=${wt.topicId}`)}
                        className="block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5"
                      >
                        Practice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {attemptedCount === 0
                    ? 'Start practicing questions to uncover your strengths and growth areas!'
                    : 'Great job! No weak topics detected yet.'}
                </p>
              </div>
            )}
          </div>

          {/* Recent Mock Tests Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <span>Recent Mock Tests</span>
              </h3>
              {testsCompleted > 0 && (
                <Link to="/history" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  View All
                </Link>
              )}
            </div>

            {recentTests.length > 0 ? (
              <div className="mt-4 space-y-3">
                {recentTests.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/mock-test/result/${t.id}`)}
                    className="cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                        {t.title}
                      </p>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          t.scorePercentage >= 70
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : t.scorePercentage >= 40
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                        }`}
                      >
                        {t.scorePercentage}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {t.correctCount}/{t.totalQuestions}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(t.timeTakenSeconds / 60)}m {t.timeTakenSeconds % 60}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 text-center">
                <Sparkles className="w-6 h-6 text-amber-500 mx-auto" />
                <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  No mock tests completed yet.
                </p>
                <button
                  onClick={() => navigate('/mock-test')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Start Your First Test
                </button>
              </div>
            )}
          </div>

          {/* Quick Bookmarks Access */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <BookmarkCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Saved Bookmarks
                </p>
                <p className="text-[11px] text-slate-500">
                  {bookmarkCount} questions bookmarked
                </p>
              </div>
            </div>
            <Link
              to="/bookmarks"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Review
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
