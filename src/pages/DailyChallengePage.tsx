import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Flame,
  Bookmark,
  BookmarkCheck,
  Play,
  RotateCcw,
  Filter,
} from 'lucide-react';
import {
  getOrCreateDaily60Questions,
  fetchGroundedDailyQuestions,
  getGroundedExplanation,
  getTodayDateString,
  type DailySetInfo,
} from '../services/dailyQuestionService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { db } from '../db/db';
import { shuffleQuestionOptions } from '../utils/testEngine';
import type { Question, Difficulty, ActiveTestSession, ActiveTestQuestion } from '../types';

export const DailyChallengePage: React.FC = () => {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const todayStr = getTodayDateString();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dailyInfo, setDailyInfo] = useState<DailySetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Difficulty filter: 'all' | 'easy' | 'medium' | 'hard'
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Difficulty>('all');

  // Active question in the daily viewer
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [groundedExp, setGroundedExp] = useState<{ text: string; sources: Array<{ title?: string; uri?: string }> } | null>(null);
  const [groundedLoading, setGroundedLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // User responses map
  const [userAnswers, setUserAnswers] = useState<Record<string, { choice: string; isCorrect: boolean }>>({});

  const loadDailyQuestions = async (date: string, force = false) => {
    try {
      setLoading(true);
      const info = await getOrCreateDaily60Questions(date, force);
      setDailyInfo(info);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyQuestions(selectedDate);
  }, [selectedDate]);

  // Filter questions based on difficulty selection
  const filteredQuestions = dailyInfo?.questions.filter((q) => {
    if (difficultyFilter === 'all') return true;
    return q.difficulty === difficultyFilter;
  }) || [];

  const currentQ: Question | undefined = filteredQuestions[currentIndex] || dailyInfo?.questions[0];

  useEffect(() => {
    if (!currentQ) return;
    const answered = userAnswers[currentQ.id];
    if (answered) {
      setSelectedOption(answered.choice);
      setIsSubmitted(true);
    } else {
      setSelectedOption(null);
      setIsSubmitted(false);
    }
    setGroundedExp(null);

    // Check bookmark state
    db.bookmarks.get(currentQ.id).then((bm) => {
      setIsBookmarked(!!bm);
    }).catch(() => setIsBookmarked(false));
  }, [currentIndex, currentQ, userAnswers]);

  const handleSelectOption = (optId: string) => {
    if (isSubmitted) return;
    setSelectedOption(optId);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || !currentQ) return;

    const isCorrect = selectedOption === currentQ.correctAnswer;
    setIsSubmitted(true);

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: { choice: selectedOption, isCorrect },
    }));

    // Record in db practice progress
    try {
      const existing = await db.practiceProgress.get(currentQ.id);
      await db.practiceProgress.put({
        questionId: currentQ.id,
        categoryId: currentQ.categoryId,
        topicId: currentQ.topicId,
        selectedAnswer: selectedOption,
        isCorrect,
        attemptCount: (existing?.attemptCount || 0) + 1,
        lastAttemptedAt: Date.now(),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentQ) return;
    try {
      if (isBookmarked) {
        await db.bookmarks.delete(currentQ.id);
        setIsBookmarked(false);
      } else {
        await db.bookmarks.put({
          questionId: currentQ.id,
          categoryId: currentQ.categoryId,
          topicId: currentQ.topicId,
          savedAt: Date.now(),
          note: `Bookmarked from Daily 60 Challenge (${selectedDate})`,
        });
        setIsBookmarked(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Launch a 60-Minute Timed Mock Test with all 60 questions from this daily challenge
  const handleLaunchDailyMockTest = async () => {
    if (!dailyInfo || dailyInfo.questions.length === 0) return;

    const activeQuestions: ActiveTestQuestion[] = dailyInfo.questions.map((q) => {
      const { shuffledOptions, correctAnswerId } = shuffleQuestionOptions(q, false);
      return {
        questionId: q.id,
        originalQuestion: q,
        shuffledOptions,
        correctAnswerId,
        userAnswer: undefined,
        isMarkedForReview: false,
        status: 'not_visited',
      };
    });

    const now = Date.now();
    const durationMinutes = 60; // 60 minutes for 60 questions
    const session: ActiveTestSession = {
      id: 'current-test-session',
      title: `Daily 60 Challenge Exam (${selectedDate})`,
      categoryIds: ['quant', 'reasoning', 'verbal', 'gk', 'tech'],
      topicIds: [],
      difficulty: 'mixed',
      totalQuestions: activeQuestions.length,
      durationMinutes,
      startedAt: now,
      deadlineTimestamp: now + durationMinutes * 60 * 1000,
      questions: activeQuestions,
      currentIndex: 0,
      isCompleted: false,
    };

    await db.activeTestSession.put(session);
    navigate('/mock-test/active');
  };

  const handleSyncGoogleSearch = async () => {
    if (!isOnline) {
      setSyncMessage('Connect to the internet to sync fresh Google Search grounded questions.');
      return;
    }

    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await fetchGroundedDailyQuestions(20);
      if (result.success) {
        setSyncMessage(`Successfully synced ${result.questions?.length} Google Search grounded questions into today's challenge!`);
        await loadDailyQuestions(selectedDate);
      } else {
        setSyncMessage(result.error || 'Failed to sync search-grounded questions.');
      }
    } catch (err: any) {
      setSyncMessage(err?.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleFetchGroundedExplanation = async () => {
    if (!currentQ || !isOnline) return;
    setGroundedLoading(true);
    try {
      const result = await getGroundedExplanation(currentQ.question, currentQ.options, selectedOption || undefined);
      if (result.success && result.explanation) {
        setGroundedExp({
          text: result.explanation,
          sources: result.sources || [],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGroundedLoading(false);
    }
  };

  // Quick date change helpers
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${da}`);
  };

  const answeredCount = Object.keys(userAnswers).length;
  const correctCount = Object.values(userAnswers).filter((a) => a.isCorrect).length;

  if (loading || !dailyInfo) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Preparing 60 daily questions for {selectedDate}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider text-white">
              <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
              Daily 60 Questions Challenge
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-black/25 text-white backdrop-blur-xs">
              <Calendar className="w-3.5 h-3.5" />
              {selectedDate} {selectedDate === todayStr ? '(Today)' : ''}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Daily 60 Practice Questions
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
            Every calendar day features a <strong>completely different set of 60 questions</strong> with a balanced difficulty mix: <strong>{dailyInfo.easyCount} Easy</strong>, <strong>{dailyInfo.mediumCount} Medium</strong>, and <strong>{dailyInfo.hardCount} Hard</strong> questions (not all of one level) covering Quantitative Aptitude, Logical Reasoning, Verbal Ability, General Knowledge, and Technical CS.
          </p>

          {/* Difficulty summary pill */}
          <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-xl bg-emerald-500/90 font-bold text-white shadow-xs">
              {dailyInfo.easyCount} Easy
            </span>
            <span className="px-3 py-1 rounded-xl bg-blue-500/90 font-bold text-white shadow-xs">
              {dailyInfo.mediumCount} Medium
            </span>
            <span className="px-3 py-1 rounded-xl bg-purple-600/90 font-bold text-white shadow-xs">
              {dailyInfo.hardCount} Hard
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/25 font-bold text-white">
              Total 60 Questions
            </span>
            <span className="px-3 py-1 rounded-xl bg-black/20 text-white/90 font-medium">
              100% Offline Capable
            </span>
          </div>
        </div>

        {/* Date Selector and Action Toolbar */}
        <div className="mt-6 relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={handleLaunchDailyMockTest}
            className="flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-4 py-2.5 text-xs font-extrabold shadow-md transition active:scale-95"
            title="Launch full 60 questions as a timed 60-minute test"
          >
            <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
            <span>Launch Timed 60-Min Mock Exam</span>
          </button>

          {/* Date Picker controls */}
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-xs p-1 rounded-xl border border-white/20">
            <button
              onClick={() => handleShiftDate(-1)}
              className="px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20 rounded-lg transition"
              title="Previous Day's 60 Questions"
            >
              ← Prev Day
            </button>
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                selectedDate === todayStr ? 'bg-white text-slate-900 shadow-xs' : 'text-white hover:bg-white/20'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleShiftDate(1)}
              className="px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20 rounded-lg transition"
              title="Next Day's 60 Questions"
            >
              Next Day →
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 rounded-lg border-0 cursor-pointer font-mono"
              title="Pick any calendar date for different 60 questions"
            />
          </div>

          {/* Sync with Google Search Grounding Button */}
          <button
            onClick={handleSyncGoogleSearch}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-xl bg-black/25 hover:bg-black/35 border border-white/20 text-white px-3.5 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50"
            title="Fetch questions verified with Google Search data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Searching...' : 'Sync Search Grounding'}</span>
          </button>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {syncMessage && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => setSyncMessage(null)} className="font-bold uppercase text-[10px] opacity-70">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Progress</span>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {answeredCount} / 60
          </p>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(answeredCount / 60) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correct Score</span>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {correctCount}
          </p>
          <p className="text-[10px] text-slate-500">Correct answers in this set</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Accuracy</span>
          <p className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%
          </p>
          <p className="text-[10px] text-slate-500">Based on attempted questions</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Daily Date</span>
          <p className="mt-1 text-base font-black text-slate-900 dark:text-white truncate">
            {selectedDate}
          </p>
          <p className="text-[10px] text-slate-500">Unique seed #{selectedDate.replace(/-/g, '')}</p>
        </div>
      </div>

      {/* Difficulty Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-500 ml-1" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mr-2">Filter Level:</span>
          {(['all', 'easy', 'medium', 'hard'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setDifficultyFilter(lvl);
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                difficultyFilter === lvl
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lvl === 'all'
                ? `All (60)`
                : lvl === 'easy'
                ? `Easy (${dailyInfo.easyCount})`
                : lvl === 'medium'
                ? `Medium (${dailyInfo.mediumCount})`
                : `Hard (${dailyInfo.hardCount})`}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 px-2 font-medium">
          Showing {filteredQuestions.length} questions
        </span>
      </div>

      {/* Question Palette / Grid of 60 Buttons */}
      <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Question Matrix (60 Questions)
          </span>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Correct
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Incorrect
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" /> Unanswered
            </span>
          </div>
        </div>

        {/* 60 Questions Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-40 overflow-y-auto pr-1">
          {filteredQuestions.map((q, idx) => {
            const ans = userAnswers[q.id];
            const isCurrent = idx === currentIndex;

            let btnStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';
            if (ans) {
              if (ans.isCorrect) {
                btnStyle = 'bg-emerald-500 text-white font-bold';
              } else {
                btnStyle = 'bg-rose-500 text-white font-bold';
              }
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-8 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center relative ${btnStyle} ${
                  isCurrent ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900 scale-105 z-10' : ''
                }`}
                title={`Q${idx + 1}: ${q.difficulty.toUpperCase()} - ${q.categoryId}`}
              >
                <span>{idx + 1}</span>
                <span
                  className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
                    q.difficulty === 'easy'
                      ? 'bg-emerald-400'
                      : q.difficulty === 'medium'
                      ? 'bg-blue-400'
                      : 'bg-purple-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Question Player */}
      {currentQ && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {/* Question Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/70 dark:bg-slate-850/50">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-black uppercase font-mono px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Question {currentIndex + 1} of {filteredQuestions.length}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                  currentQ.difficulty === 'easy'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : currentQ.difficulty === 'medium'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                }`}
              >
                {currentQ.difficulty}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                {currentQ.categoryId} • {currentQ.topicId.replace(/-/g, ' ')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleBookmark}
                className={`p-2 rounded-xl border transition ${
                  isBookmarked
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this daily question'}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4 fill-amber-500" /> : <Bookmark className="w-4 h-4" />}
              </button>

              <select
                value={currentIndex}
                onChange={(e) => setCurrentIndex(Number(e.target.value))}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 px-2 text-xs font-mono font-bold"
              >
                {filteredQuestions.map((_, i) => (
                  <option key={i} value={i}>
                    Q{i + 1} {userAnswers[filteredQuestions[i].id] ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Statement & Options */}
          <div className="p-6 sm:p-8 space-y-6">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.question}
            </h2>

            <div className="space-y-3">
              {currentQ.options.map((opt) => {
                const isSelected = selectedOption === opt.id;
                const isCorrect = opt.id === currentQ.correctAnswer;

                let style = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700';
                if (isSubmitted) {
                  if (isCorrect) {
                    style = 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20';
                  } else if (isSelected && !isCorrect) {
                    style = 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20';
                  }
                } else if (isSelected) {
                  style = 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/20';
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    disabled={isSubmitted}
                    className={`w-full text-left flex items-center justify-between p-4 rounded-xl border transition-all ${style} ${
                      !isSubmitted ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isSubmitted && isCorrect
                            ? 'bg-emerald-600 text-white'
                            : isSubmitted && isSelected && !isCorrect
                            ? 'bg-rose-600 text-white'
                            : isSelected
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="text-sm font-medium">{opt.text}</span>
                    </div>

                    {isSubmitted && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {isSubmitted && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                {!isSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOption}
                    className="rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Answer Submitted</span>
                    {isOnline && (
                      <button
                        onClick={handleFetchGroundedExplanation}
                        disabled={groundedLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{groundedLoading ? 'Searching...' : 'Google Search Grounded Deep Dive'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => setCurrentIndex((i) => Math.min(filteredQuestions.length - 1, i + 1))}
                  disabled={currentIndex >= filteredQuestions.length - 1}
                  className="flex items-center gap-1 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-xs font-bold hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Explanation & References */}
            {isSubmitted && (
              <div className="space-y-4 pt-2">
                <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    <span>Step-by-Step Verified Solution:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                    {currentQ.explanation}
                  </p>
                </div>

                {/* Grounded Explanation if fetched */}
                {groundedExp && (
                  <div className="rounded-2xl border border-blue-200 dark:border-blue-900/80 bg-blue-50/60 dark:bg-blue-950/30 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                        <Search className="w-4 h-4 text-blue-600" />
                        <span>Google Search Grounded Analysis</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {groundedExp.text}
                    </p>
                    {groundedExp.sources.length > 0 && (
                      <div className="pt-2 border-t border-blue-100 dark:border-blue-900/50">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1">
                          Verified Search Citations:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {groundedExp.sources.map((s, idx) => (
                            <a
                              key={idx}
                              href={s.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 hover:underline"
                            >
                              <span>{s.title || s.uri}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
