import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Info,
  Search,
  BookOpen,
} from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { db } from '../db/db';

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    quant: true,
    reasoning: true,
    verbal: true,
    gk: true,
    tech: true,
    interview: true,
  });
  const [topicQuestionCounts, setTopicQuestionCounts] = useState<Record<string, number>>({});
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const allQuestions = await db.questions.toArray();
        const counts: Record<string, number> = {};
        for (const q of allQuestions) {
          counts[q.topicId] = (counts[q.topicId] || 0) + 1;
        }
        setTopicQuestionCounts(counts);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCounts();
  }, []);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredCategories = CATEGORIES.map((cat) => {
    const matchesCategoryName = cat.name.toLowerCase().includes(filterQuery.toLowerCase());
    const filteredTopics = cat.topics.filter(
      (t) =>
        t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
        matchesCategoryName
    );
    return {
      ...cat,
      topics: filteredTopics,
    };
  }).filter((cat) => cat.topics.length > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Educational Categories & Topics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Browse structured learning paths across Aptitude, Reasoning, Verbal, GK, and Technical tracks.
          </p>
        </div>

        {/* Filter input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter subtopics..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* GK Offline Notice Callout */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
        <Info className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <strong className="font-bold">Offline Integrity Note on General Knowledge:</strong> All GK content in PrepVault comprises permanent static GK (historical milestones, constitutional articles, scientific principles, and geographical features). We deliberately avoid claiming volatile current affairs are up-to-date while disconnected, ensuring verified offline accuracy.
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => {
          const isExpanded = expandedCategories[cat.id];

          return (
            <div
              key={cat.id}
              id={cat.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${cat.color} text-white shadow-xs`}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{cat.name}</span>
                      {cat.id === 'gk' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Static Verified
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl line-clamp-1">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {cat.topics.length} Topics
                  </span>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>
              </button>

              {/* Subtopics Grid */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 p-5 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cat.topics.map((topic) => {
                      const count = topicQuestionCounts[topic.id] || 0;

                      return (
                        <div
                          key={topic.id}
                          className="flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {topic.name}
                              </h3>
                              <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                {count > 0 ? `${count} Qs` : 'Available'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {topic.description}
                            </p>
                          </div>

                          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                            <button
                              onClick={() => navigate(`/practice?category=${cat.id}&topic=${topic.id}`)}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 text-xs font-semibold shadow-xs transition active:scale-95"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>Practice</span>
                            </button>
                            <button
                              onClick={() => navigate(`/mock-test?category=${cat.id}&topic=${topic.id}`)}
                              className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 py-1.5 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition"
                              title="Generate Mock Test from this topic"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Mock</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
