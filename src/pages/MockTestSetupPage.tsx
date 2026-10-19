import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';
import { db } from '../db/db';
import { CATEGORIES } from '../data/categories';
import { shuffleArray, shuffleQuestionOptions } from '../utils/testEngine';
import type { Difficulty, ActiveTestSession, ActiveTestQuestion } from '../types';

export const MockTestSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paramCat = searchParams.get('category');
  const paramTopic = searchParams.get('topic');

  const [title, setTitle] = useState('Standard Aptitude Mock Exam');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    paramCat ? [paramCat] : ['quant', 'reasoning']
  );
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [hasExistingSession, setHasExistingSession] = useState<boolean>(false);

  useEffect(() => {
    // Check if there is an in-progress active test session
    const checkActiveSession = async () => {
      try {
        const session = await db.activeTestSession.get('current-test-session');
        if (session && !session.isCompleted && Date.now() < session.deadlineTimestamp) {
          setHasExistingSession(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkActiveSession();
  }, []);

  const handleToggleCategory = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length === 1) return; // Keep at least one
      setSelectedCategories(selectedCategories.filter((id) => id !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(CATEGORIES.map((c) => c.id));
  };

  const handleResumeActiveTest = () => {
    navigate('/mock-test/active');
  };

  const handleStartNewTest = async () => {
    setIsStarting(true);
    try {
      // 1. Fetch available questions matching selected categories and difficulty
      let pool = await db.questions
        .filter((q) => selectedCategories.includes(q.categoryId))
        .toArray();

      if (paramTopic) {
        pool = pool.filter((q) => q.topicId === paramTopic);
      }

      if (difficulty !== 'mixed') {
        pool = pool.filter((q) => q.difficulty === difficulty);
      }

      // If pool is smaller than questionCount, fall back to all questions in selected categories
      if (pool.length < questionCount) {
        pool = await db.questions
          .filter((q) => selectedCategories.includes(q.categoryId))
          .toArray();
      }

      // 2. Randomly select questions
      const selected = shuffleArray(pool).slice(0, Math.min(questionCount, pool.length));

      // 3. Prepare active test questions with shuffled options (preserving correct answer!)
      const activeQuestions: ActiveTestQuestion[] = selected.map((q) => {
        const { shuffledOptions, correctAnswerId } = shuffleQuestionOptions(q, shuffleOptions);
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

      // 4. Create ActiveTestSession
      const now = Date.now();
      const deadline = now + durationMinutes * 60 * 1000;

      const newSession: ActiveTestSession = {
        id: 'current-test-session',
        title,
        categoryIds: selectedCategories,
        topicIds: paramTopic ? [paramTopic] : [],
        difficulty,
        totalQuestions: activeQuestions.length,
        durationMinutes,
        startedAt: now,
        deadlineTimestamp: deadline,
        questions: activeQuestions,
        currentIndex: 0,
        isCompleted: false,
      };

      await db.activeTestSession.put(newSession);
      navigate('/mock-test/active');
    } catch (err) {
      console.error('Failed to create test session:', err);
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Mock Test Configuration</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Simulate real exam conditions with strict countdown timing, randomized question palettes, and review marking.
        </p>
      </div>

      {/* Resume Banner if test in progress */}
      {hasExistingSession && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                You have a live test in progress!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your remaining time is preserved across reloads.
              </p>
            </div>
          </div>
          <button
            onClick={handleResumeActiveTest}
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-semibold hover:bg-indigo-700 transition"
          >
            Resume Active Test
          </button>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Test Name */}
        <div>
          <label htmlFor="test-title-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Test Title / Preset
          </label>
          <input
            id="test-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Categories Selection */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Categories Included
            </span>
            <button
              onClick={handleSelectAllCategories}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Select All
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs sm:text-sm">{cat.name}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Number of Questions & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Questions Count */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Question Count
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    questionCount === count
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {count} Qs
                </button>
              ))}
            </div>
          </div>

          {/* Time Duration */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Duration (Minutes)
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    durationMinutes === mins
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Difficulty Level
          </label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {(['mixed', 'easy', 'medium', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficulty(diff)}
                className={`py-2 text-xs font-bold rounded-xl border capitalize transition ${
                  difficulty === diff
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Option Randomization Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Shuffle Options
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Randomizes option positions while preserving correct answers to prevent position bias.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShuffleOptions(!shuffleOptions)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              shuffleOptions ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                shuffleOptions ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Start Button */}
        <div className="pt-2">
          <button
            onClick={handleStartNewTest}
            disabled={isStarting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 px-6 font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isStarting ? 'Preparing Exam...' : 'Start Mock Test Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
