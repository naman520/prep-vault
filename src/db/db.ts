import Dexie, { type Table } from 'dexie';
import type {
  Question,
  QuestionPackMetadata,
  Bookmark,
  PracticeProgress,
  PracticeSessionState,
  ActiveTestSession,
  TestResult,
  AppSettings,
} from '../types/index.ts';
import { INITIAL_QUESTION_BANK, DEFAULT_PACK_METADATA } from '../data/bundledQuestions';

export class PrepVaultDB extends Dexie {
  questionPacks!: Table<QuestionPackMetadata, string>;
  questions!: Table<Question, string>;
  bookmarks!: Table<Bookmark, string>;
  practiceProgress!: Table<PracticeProgress, string>;
  practiceSessions!: Table<PracticeSessionState, string>;
  activeTestSession!: Table<ActiveTestSession, string>;
  testResults!: Table<TestResult, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('PrepVaultDB');
    this.version(1).stores({
      questionPacks: 'id, name, isBundled',
      questions: 'id, packId, categoryId, topicId, difficulty, *tags',
      bookmarks: 'questionId, categoryId, topicId, savedAt',
      practiceProgress: 'questionId, categoryId, topicId, isCorrect, lastAttemptedAt',
      practiceSessions: 'categoryId, topicId, updatedAt',
      activeTestSession: 'id, deadlineTimestamp, isCompleted',
      testResults: 'id, completedAt, scorePercentage',
      settings: 'id',
    });
  }
}

export const db = new PrepVaultDB();

const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  brandName: 'PrepVault',
  theme: 'system',
  instantFeedback: true,
  autoRevealExplanation: false,
  defaultTestDurationMinutes: 15,
  defaultTestQuestionCount: 15,
  shuffleOptionsInPractice: false,
  shuffleOptionsInMockTest: true,
  keyboardShortcutsEnabled: true,
};

/**
 * Initializes the database and seeds the default bundled question pack if not already present.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // 1. Settings check
    const existingSettings = await db.settings.get('app-settings');
    if (!existingSettings) {
      await db.settings.put(DEFAULT_SETTINGS);
    }

    // 2. Question Pack Check
    const existingPack = await db.questionPacks.get(DEFAULT_PACK_METADATA.metadata.id);
    if (!existingPack) {
      // Seed default pack
      await db.transaction('rw', db.questionPacks, db.questions, async () => {
        await db.questionPacks.put({
          id: DEFAULT_PACK_METADATA.metadata.id,
          name: DEFAULT_PACK_METADATA.metadata.name,
          version: DEFAULT_PACK_METADATA.metadata.version,
          description: DEFAULT_PACK_METADATA.metadata.description,
          author: DEFAULT_PACK_METADATA.metadata.author,
          questionCount: INITIAL_QUESTION_BANK.length,
          installedAt: Date.now(),
          isBundled: true,
        });

        await db.questions.bulkPut(INITIAL_QUESTION_BANK);
      });
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
