import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  EyeOff,
  Filter,
  SlidersHorizontal,
  Lightbulb,
} from 'lucide-react';
import { db } from '../db/db';
import { CATEGORIES } from '../data/categories';
import { shuffleArray } from '../utils/testEngine';
import type { Question, Difficulty } from '../types';

export const PracticePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCat = searchParams.get('category') || 'quant';
  const initialTopic = searchParams.get('topic') || '';
  const initialMode = searchParams.get('mode') || '';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [isRandomized, setIsRandomized] = useState<boolean>(false);
  const [autoRevealMode, setAutoRevealMode] = useState<boolean>(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // User state for active question
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  // History / cache of answers in this practice session
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, { selected: string; isSubmitted: boolean }>>({});

  // Sync category topics
  const currentCategoryObj = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  const availableTopics = currentCategoryObj?.topics || [];

  // Load questions based on category, topic, difficulty
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      let query = db.questions.toCollection();

      if (initialMode === 'daily') {
        // Daily mode picks 10 random questions across all categories
        const all = await query.toArray();
        const shuffled = shuffleArray(all).slice(0, 10);
        setQuestions(shuffled);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      if (selectedCategory) {
        query = db.questions.where('categoryId').equals(selectedCategory);
      }

      let list = await query.toArray();

      if (selectedTopic) {
        list = list.filter((q) => q.topicId === selectedTopic);
      }

      if (difficultyFilter !== 'all') {
        list = list.filter((q) => q.difficulty === difficultyFilter);
      }

      if (isRandomized) {
        list = shuffleArray(list);
      }

      setQuestions(list);
      setCurrentIndex(0);
      setSessionAnswers({});
    } catch (err) {
      console.error('Failed to load practice questions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedTopic, difficultyFilter, isRandomized, initialMode]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Update bookmarks and active answer when currentIndex or questions change
  const currentQ = questions[currentIndex];

  useEffect(() => {
    if (!currentQ) return;

    // Check if bookmarked in Dexie
    const checkBookmark = async () => {
      try {
        const b = await db.bookmarks.get(currentQ.id);
        setIsBookmarked(!!b);
      } catch (e) {
        console.error(e);
      }
    };
    checkBookmark();

    // Check if previously answered in this session
    const prev = sessionAnswers[currentQ.id];
    if (prev) {
      setSelectedOption(prev.selected);
      setIsSubmitted(prev.isSubmitted);
      setShowExplanation(prev.isSubmitted);
    } else {
      setSelectedOption(null);
      setIsSubmitted(false);
      setShowExplanation(autoRevealMode);
    }
    setShowHint(false);

    // Save session state to Dexie for resume capability
    db.practiceSessions.put({
      categoryId: selectedCategory,
      topicId: selectedTopic,
      difficulty: difficultyFilter,
      currentIndex,
      questionIds: questions.map((q) => q.id),
      userAnswers: {},
      revealedExplanations: {},
      updatedAt: Date.now(),
    }).catch(() => {});
  }, [currentQ, currentIndex, sessionAnswers, autoRevealMode, selectedCategory, selectedTopic, difficultyFilter, questions]);

  // Handle Option Selection
  const handleSelectOption = (optionId: string) => {
    if (isSubmitted) return; // Prevent changing after submit unless retrying
    setSelectedOption(optionId);
  };

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (!selectedOption || !currentQ) return;

    const isCorrect = selectedOption === currentQ.correctAnswer;
    setIsSubmitted(true);
    setShowExplanation(true);

    // Save in session state
    setSessionAnswers((prev) => ({
      ...prev,
      [currentQ.id]: { selected: selectedOption, isSubmitted: true },
    }));

    // Save to persistent Dexie practice progress
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

  // Toggle Bookmark
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
        });
        setIsBookmarked(true);
      }
    } catch (e) {
      console.error('Bookmark toggle error:', e);
    }
  };

  // Retry Question
  const handleRetry = () => {
    if (!currentQ) return;
    setSelectedOption(null);
    setIsSubmitted(false);
    setShowExplanation(false);
    setSessionAnswers((prev) => {
      const updated = { ...prev };
      delete updated[currentQ.id];
      return updated;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (!currentQ) return;

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        handleSelectOption(key);
      } else if (['1', '2', '3', '4'].includes(key)) {
        const mapped = ['A', 'B', 'C', 'D'][parseInt(key) - 1];
        if (mapped) handleSelectOption(mapped);
      } else if (e.key === 'ArrowRight' || key === 'N') {
        if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft' || key === 'P') {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
      } else if (e.key === 'Enter') {
        if (selectedOption && !isSubmitted) {
          handleSubmitAnswer();
        }
      } else if (key === 'E') {
        setShowExplanation((prev) => !prev);
      } else if (key === 'B') {
        handleToggleBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, selectedOption, isSubmitted, currentIndex, questions.length]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Filter Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="category-select" className="text-xs font-semibold text-slate-500">Category:</label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedTopic('');
                  setSearchParams({ category: e.target.value });
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-1.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="topic-select" className="text-xs font-semibold text-slate-500">Topic:</label>
              <select
                id="topic-select"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-1.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 max-w-[200px] truncate"
              >
                <option value="">All Subtopics ({availableTopics.length})</option>
                {availableTopics.map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg capitalize transition ${
                    difficultyFilter === diff
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Options: Shuffle & Answer Reveal Mode */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRandomized(!isRandomized)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                isRandomized
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              title="Toggle randomized question order"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>

            <button
              onClick={() => setAutoRevealMode(!autoRevealMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                autoRevealMode
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              title="Always show explanation immediately without answering first"
            >
              {autoRevealMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Auto-Reveal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Practice Area */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-xs text-slate-500">Loading questions from local store...</p>
          </div>
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Filter className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
            No questions found matching your filter
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Try resetting the difficulty filter or selecting a different topic.
          </p>
          <button
            onClick={() => {
              setSelectedTopic('');
              setDifficultyFilter('all');
            }}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {/* Question Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/70 dark:bg-slate-850/50">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                Q {currentIndex + 1} of {questions.length}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  currentQ.difficulty === 'easy'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : currentQ.difficulty === 'medium'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {currentQ.difficulty}
              </span>
              {currentQ.isStaticGK && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Static GK
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentQ.hints && currentQ.hints.length > 0 && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className={`p-2 rounded-xl transition ${
                    showHint
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  title="Toggle Hint"
                  aria-label="Toggle question hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleToggleBookmark}
                className={`p-2 rounded-xl transition ${
                  isBookmarked
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
                aria-label="Bookmark question"
              >
                {isBookmarked ? <BookmarkCheck className="w-5 h-5 fill-amber-500" /> : <Bookmark className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Question Content */}
          <div className="p-6 sm:p-8 space-y-6">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.question}
            </h2>

            {/* Optional Hint Callout */}
            {showHint && currentQ.hints && currentQ.hints.length > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3 animate-fadeIn">
                <Lightbulb className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <strong className="font-semibold">Hint:</strong> {currentQ.hints[0]}
                </div>
              </div>
            )}

            {/* Multiple Choice Options */}
            <div className="space-y-3">
              {currentQ.options.map((option) => {
                const isSelected = selectedOption === option.id;
                const isCorrectAnswer = option.id === currentQ.correctAnswer;
                const showCorrectness = isSubmitted || autoRevealMode;

                let optionStyles = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700';

                if (showCorrectness) {
                  if (isCorrectAnswer) {
                    optionStyles = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20';
                  } else if (isSelected && !isCorrectAnswer) {
                    optionStyles = 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20';
                  }
                } else if (isSelected) {
                  optionStyles = 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20';
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option.id)}
                    disabled={isSubmitted}
                    className={`w-full text-left flex items-center justify-between p-4 rounded-xl border transition-all ${optionStyles} ${
                      !isSubmitted ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          showCorrectness && isCorrectAnswer
                            ? 'bg-emerald-600 text-white'
                            : showCorrectness && isSelected && !isCorrectAnswer
                            ? 'bg-rose-600 text-white'
                            : isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {option.id}
                      </span>
                      <span className="text-sm font-medium">{option.text}</span>
                    </div>

                    {showCorrectness && isCorrectAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {showCorrectness && isSelected && !isCorrectAnswer && (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {!isSubmitted && !autoRevealMode ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOption}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-xs transition active:scale-95"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowExplanation(!showExplanation)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-semibold transition"
                    >
                      {showExplanation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showExplanation ? 'Hide Explanation' : 'View Explanation'}</span>
                    </button>
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 text-xs font-semibold transition"
                      title="Retry this question"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Prev / Next navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={currentIndex === questions.length - 1}
                  className="flex items-center gap-1 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3.5 py-2 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Detailed Explanation Panel */}
            {showExplanation && (
              <div className="mt-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-5 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
                  <HelpCircle className="w-4 h-4 text-indigo-500" />
                  <span>Detailed Step-by-Step Explanation</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                  {currentQ.explanation}
                </div>
                {currentQ.tags && currentQ.tags.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {currentQ.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                      >
                        #{t}
                      </span>
                    ))}
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
