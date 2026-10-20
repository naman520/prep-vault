import { db } from '../db/db';
import { generateDaily60Questions } from './dailyQuestionEngine';
import type { Question, Difficulty } from '../types';

export interface DailySetInfo {
  dateStr: string;
  totalQuestions: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  questions: Question[];
  isGroundedWithSearch?: boolean;
  groundingSources?: string[];
}

/**
 * Returns today's date string YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ensures a 60-question daily challenge is generated and available in Dexie.
 * The 60 questions have a balanced difficulty mix: 20 easy, 25 medium, 15 hard (total 60).
 * Every date yields a completely different set of 60 questions offline!
 */
export async function getOrCreateDaily60Questions(dateStr?: string, forceRegenerate: boolean = false): Promise<DailySetInfo> {
  const targetDate = dateStr || getTodayDateString();
  const packId = `daily-pack-${targetDate}`;

  // 1. Check if we already have questions for today in Dexie
  if (!forceRegenerate) {
    const existingQuestions = await db.questions.where('packId').equals(packId).toArray();
    if (existingQuestions.length >= 60) {
      const easyCount = existingQuestions.filter((q) => q.difficulty === 'easy').length;
      const mediumCount = existingQuestions.filter((q) => q.difficulty === 'medium').length;
      const hardCount = existingQuestions.filter((q) => q.difficulty === 'hard').length;

      return {
        dateStr: targetDate,
        totalQuestions: existingQuestions.length,
        easyCount,
        mediumCount,
        hardCount,
        questions: existingQuestions,
        isGroundedWithSearch: existingQuestions.some((q) => (q as any).groundedSource),
      };
    }
  }

  // 2. Generate 60 brand-new, distinct questions for this target date using procedural engine
  const dailyQuestions: Question[] = generateDaily60Questions(targetDate);

  // Store in Dexie
  await db.transaction('rw', db.questions, db.questionPacks, async () => {
    await db.questionPacks.put({
      id: packId,
      name: `Daily 60 Questions (${targetDate})`,
      version: '1.0.0',
      description: `60 daily practice questions across Quant, Reasoning, Verbal, GK, and Tech with 20 Easy, 25 Medium, and 15 Hard questions.`,
      questionCount: dailyQuestions.length,
      installedAt: Date.now(),
      isBundled: false,
    });
    await db.questions.bulkPut(dailyQuestions);
  });

  const easyCount = dailyQuestions.filter((q) => q.difficulty === 'easy').length;
  const mediumCount = dailyQuestions.filter((q) => q.difficulty === 'medium').length;
  const hardCount = dailyQuestions.filter((q) => q.difficulty === 'hard').length;

  return {
    dateStr: targetDate,
    totalQuestions: dailyQuestions.length,
    easyCount,
    mediumCount,
    hardCount,
    questions: dailyQuestions,
    isGroundedWithSearch: false,
  };
}

/**
 * Calls server-side /api/generate-daily-questions to fetch search-grounded questions using gemini-3.8-flash with Google Search
 */
export async function fetchGroundedDailyQuestions(count: number = 20): Promise<{
  success: boolean;
  questions?: Question[];
  sources?: string[];
  error?: string;
}> {
  try {
    const response = await fetch('/api/generate-daily-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateStr: getTodayDateString(),
        count,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.questions)) {
      throw new Error(data.error || 'Invalid API response format');
    }

    const today = getTodayDateString();
    const packId = `daily-pack-${today}`;

    // Enrich and store in Dexie
    const enrichedQuestions: Question[] = data.questions.map((q: any, i: number) => ({
      id: q.id || `grounded-${today}-${i + 1}`,
      packId,
      categoryId: q.categoryId || 'gk',
      topicId: q.topicId || 'general-science',
      difficulty: (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium') as Difficulty,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      hints: q.hints || [],
      tags: [...(q.tags || []), 'GoogleSearchGrounded', today],
      source: q.groundedSource || 'Google Search Grounding',
    }));

    await db.questions.bulkPut(enrichedQuestions);

    return {
      success: true,
      questions: enrichedQuestions,
      sources: data.groundingSources || [],
    };
  } catch (err: any) {
    console.error('Failed to fetch grounded daily questions:', err);
    return {
      success: false,
      error: err?.message || 'Unable to connect to Google Search Grounding service',
    };
  }
}

/**
 * Fetches Google Search grounded explanation for any question
 */
export async function getGroundedExplanation(
  question: string,
  options: any[],
  userAnswer?: string
): Promise<{ success: boolean; explanation?: string; sources?: Array<{ title?: string; uri?: string }>; error?: string }> {
  try {
    const response = await fetch('/api/grounded-explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options, userAnswer }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      explanation: data.explanation,
      sources: data.sources || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not fetch grounded explanation',
    };
  }
}
