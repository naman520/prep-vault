import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookmarkCheck,
  Trash2,
  GraduationCap,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Bookmark,
} from 'lucide-react';
import { db } from '../db/db';
import { CATEGORIES } from '../data/categories';
import type { Question } from '../types';

export const BookmarksPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadBookmarks = async () => {
    try {
      const bList = await db.bookmarks.orderBy('savedAt').reverse().toArray();
      const qIds = bList.map((b) => b.questionId);
      const qList = await db.questions.where('id').anyOf(qIds).toArray();
      setBookmarkedQuestions(qList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemoveBookmark = async (id: string) => {
    await db.bookmarks.delete(id);
    loadBookmarks();
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = selectedCategory === 'all'
    ? bookmarkedQuestions
    : bookmarkedQuestions.filter((q) => q.categoryId === selectedCategory);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-slate-500">Loading saved bookmarks...</p>
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
            <BookmarkCheck className="w-6 h-6 text-amber-500" />
            <span>Bookmarked Questions</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review your flagged concepts, formulas, and tricky questions offline anytime.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="bookmark-category-select" className="text-xs font-semibold text-slate-500">Category:</label>
          <select
            id="bookmark-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Categories ({bookmarkedQuestions.length})</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {bookmarkedQuestions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h2 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
            No bookmarks saved yet
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            While practicing questions or taking tests, tap the bookmark icon to save questions here for quick revision.
          </p>
          <button
            onClick={() => navigate('/practice')}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
          >
            Start Practicing
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((q, idx) => {
            const isExp = expanded[q.id];
            const cat = CATEGORIES.find((c) => c.id === q.categoryId);

            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
              >
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {cat?.name || q.categoryId}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                        {q.difficulty}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {q.question}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRemoveBookmark(q.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Remove Bookmark"
                      aria-label="Remove bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleExpand(q.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                      aria-label="Toggle details"
                    >
                      {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExp && (
                  <div className="p-5 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                      {q.options.map((opt) => {
                        const isCorrect = opt.id === q.correctAnswer;
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 font-bold'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="font-mono">{opt.id}.</span> {opt.text}
                            </span>
                            {isCorrect && (
                              <span className="text-[10px] text-emerald-600 uppercase">Correct</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Explanation:</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {q.explanation}
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => navigate(`/practice?category=${q.categoryId}&topic=${q.topicId}`)}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Practice Topic</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
