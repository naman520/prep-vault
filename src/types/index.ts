export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string; // e.g. 'A', 'B', 'C', 'D'
  text: string;
}

export interface Question {
  id: string;
  packId: string;
  categoryId: string;
  topicId: string;
  difficulty: Difficulty;
  question: string;
  options: QuestionOption[];
  correctAnswer: string; // matches option id e.g. 'A'
  explanation: string;
  hints?: string[];
  tags: string[];
  source?: string;
  isStaticGK?: boolean; // explicitly marks static GK
}

export interface SubTopic {
  id: string;
  name: string;
  description: string;
  iconName?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  topics: SubTopic[];
}

export interface Bookmark {
  questionId: string;
  categoryId: string;
  topicId: string;
  savedAt: number;
  note?: string;
}

export interface PracticeProgress {
  questionId: string;
  categoryId: string;
  topicId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  attemptCount: number;
  lastAttemptedAt: number;
}

export interface PracticeSessionState {
  categoryId: string;
  topicId?: string;
  difficulty?: Difficulty | 'all';
  currentIndex: number;
  questionIds: string[];
  userAnswers: Record<string, string>; // questionId -> selectedOptionId
  revealedExplanations: Record<string, boolean>;
  updatedAt: number;
}

export type TestQuestionStatus = 'not_visited' | 'unanswered' | 'answered' | 'marked_for_review' | 'answered_and_marked';

export interface ActiveTestQuestion {
  questionId: string;
  originalQuestion: Question;
  shuffledOptions: QuestionOption[];
  correctAnswerId: string; // the option id that is correct in shuffledOptions
  userAnswer?: string;
  isMarkedForReview: boolean;
  status: TestQuestionStatus;
}

export interface ActiveTestSession {
  id: string;
  title: string;
  categoryIds: string[];
  topicIds: string[];
  difficulty: Difficulty | 'mixed';
  totalQuestions: number;
  durationMinutes: number;
  startedAt: number;
  deadlineTimestamp: number;
  questions: ActiveTestQuestion[];
  currentIndex: number;
  isCompleted: boolean;
}

export interface TestResult {
  id: string;
  title: string;
  startedAt: number;
  completedAt: number;
  timeTakenSeconds: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  scorePercentage: number;
  categoryBreakdown: Record<string, { total: number; correct: number }>;
  questionsSnapshot: {
    questionId: string;
    questionText: string;
    options: QuestionOption[];
    userAnswer?: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
    categoryId: string;
    topicId: string;
  }[];
}

export interface AppSettings {
  id: string;
  brandName: string;
  theme: 'light' | 'dark' | 'system';
  instantFeedback: boolean; // Practice mode: check answer immediately
  autoRevealExplanation: boolean;
  defaultTestDurationMinutes: number;
  defaultTestQuestionCount: number;
  shuffleOptionsInPractice: boolean;
  shuffleOptionsInMockTest: boolean;
  keyboardShortcutsEnabled: boolean;
}

export interface QuestionPackMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  questionCount: number;
  installedAt: number;
  isBundled: boolean;
}

export interface QuestionPackFile {
  metadata: {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;
  };
  questions: Question[];
}
