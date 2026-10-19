import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, GraduationCap, Filter, BookOpen } from 'lucide-react';
import { db } from '../db/db';
import { CATEGORIES } from '../data/categories';
import type { Question } from '../types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [results, setResults] = useState<Question[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const executeSearch = async () => {
      setIsSearching(true);
      try {
        let pool = await db.questions.toArray();

        if (categoryFilter !== 'all') {
          pool = pool.filter((q) => q.categoryId === categoryFilter);
        }

        if (!query.trim()) {
          setResults(pool.slice(0, 30));
          return;
        }

        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

        const matched = pool.filter((q) => {
          const text = `${q.question} ${q.explanation} ${q.tags.join(' ')} ${q.options.map((o) => o.text).join(' ')}`.toLowerCase();
          return terms.every((t) => text.includes(t));
        });

        setResults(matched);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    };

    executeSearch();
  }, [query, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Search className="w-6 h-6 text-indigo-500" />
          <span>Search Offline Question Bank</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Instant full-text search across all locally stored questions, answers, formulas, and explanations.
        </p>
      </div>

      {/* Search Input and Filters */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword (e.g. 'percentage', 'speed', 'python', 'constitution', 'closure')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="search-category-filter" className="text-xs font-semibold text-slate-500 sr-only">Filter by category:</label>
            <select
              id="search-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Found {results.length} matching questions locally</span>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSearchParams({});
            }}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Results List */}
      {isSearching ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Filter className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
            No matching questions found
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or checking a different category filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((q) => {
            const cat = CATEGORIES.find((c) => c.id === q.categoryId);

            return (
              <div
                key={q.id}
                onClick={() => navigate(`/practice?category=${q.categoryId}&topic=${q.topicId}`)}
                className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {cat?.name || q.categoryId}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                        {q.difficulty}
                      </span>
                      {q.isStaticGK && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Static GK
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {q.question}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {q.explanation}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                    <GraduationCap className="w-4 h-4" />
                    <span className="hidden sm:inline">Practice</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
