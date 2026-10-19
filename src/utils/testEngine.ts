import type { Question, QuestionOption, ActiveTestQuestion, QuestionPackFile, TestResult } from '../types/index.ts';

/**
 * Shuffles an array deterministically or randomly using Fisher-Yates.
 */
export function shuffleArray<T>(array: T[], seed?: number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = seed !== undefined 
      ? Math.floor((Math.sin(seed + i) * 10000) % 1 * (i + 1) + (i + 1)) % (i + 1)
      : Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles question options while guaranteeing that the correct answer is preserved.
 * Returns new options with IDs 'A', 'B', 'C', 'D' and the updated correctAnswerId.
 */
export function shuffleQuestionOptions(
  question: Question,
  shouldShuffle: boolean = true
): { shuffledOptions: QuestionOption[]; correctAnswerId: string } {
  if (!shouldShuffle) {
    return {
      shuffledOptions: [...question.options],
      correctAnswerId: question.correctAnswer,
    };
  }

  // Find the text of the original correct answer
  const originalCorrectOption = question.options.find(
    (opt) => opt.id === question.correctAnswer
  );
  const correctText = originalCorrectOption ? originalCorrectOption.text : '';

  // Randomize the options
  const shuffledTexts = shuffleArray(question.options.map((opt) => opt.text));

  // Re-assign standard option IDs 'A', 'B', 'C', 'D'
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const shuffledOptions: QuestionOption[] = shuffledTexts.map((text, idx) => ({
    id: letters[idx] || String.fromCharCode(65 + idx),
    text,
  }));

  // Locate the index where the correct text landed
  const newCorrectIndex = shuffledTexts.findIndex((t) => t === correctText);
  const correctAnswerId = newCorrectIndex !== -1 ? letters[newCorrectIndex] : 'A';

  return { shuffledOptions, correctAnswerId };
}

/**
 * Calculates score and statistics from a completed active test.
 */
export function calculateTestResults(
  questions: ActiveTestQuestion[],
  startTime: number,
  endTime: number,
  title: string
): Omit<TestResult, 'id'> {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  const categoryBreakdown: Record<string, { total: number; correct: number }> = {};

  const questionsSnapshot = questions.map((q) => {
    const isAnswered = q.userAnswer !== undefined && q.userAnswer !== '';
    const isCorrect = isAnswered && q.userAnswer === q.correctAnswerId;

    if (!isAnswered) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    const catId = q.originalQuestion.categoryId;
    if (!categoryBreakdown[catId]) {
      categoryBreakdown[catId] = { total: 0, correct: 0 };
    }
    categoryBreakdown[catId].total++;
    if (isCorrect) {
      categoryBreakdown[catId].correct++;
    }

    return {
      questionId: q.questionId,
      questionText: q.originalQuestion.question,
      options: q.shuffledOptions,
      userAnswer: q.userAnswer,
      correctAnswer: q.correctAnswerId,
      isCorrect,
      explanation: q.originalQuestion.explanation,
      categoryId: q.originalQuestion.categoryId,
      topicId: q.originalQuestion.topicId,
    };
  });

  const totalQuestions = questions.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const timeTakenSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));

  return {
    title,
    startedAt: startTime,
    completedAt: endTime,
    timeTakenSeconds,
    totalQuestions,
    correctCount,
    incorrectCount,
    unansweredCount,
    scorePercentage,
    categoryBreakdown,
    questionsSnapshot,
  };
}

/**
 * Validates a QuestionPack JSON file structure before importing.
 */
export function validateQuestionPack(data: unknown): {
  valid: boolean;
  error?: string;
  pack?: QuestionPackFile;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'File content must be a valid JSON object.' };
  }

  const p = data as Partial<QuestionPackFile>;

  if (!p.metadata || typeof p.metadata !== 'object') {
    return { valid: false, error: 'Missing metadata section in question pack.' };
  }

  if (!p.metadata.id || typeof p.metadata.id !== 'string') {
    return { valid: false, error: 'Pack metadata must include a unique string ID.' };
  }

  if (!p.metadata.name || typeof p.metadata.name !== 'string') {
    return { valid: false, error: 'Pack metadata must include a name.' };
  }

  if (!Array.isArray(p.questions) || p.questions.length === 0) {
    return { valid: false, error: 'Pack must contain an array with at least one question.' };
  }

  const idSet = new Set<string>();

  for (let i = 0; i < p.questions.length; i++) {
    const q = p.questions[i];
    if (!q.id || typeof q.id !== 'string') {
      return { valid: false, error: `Question at index ${i} is missing a string ID.` };
    }
    if (idSet.has(q.id)) {
      return { valid: false, error: `Duplicate question ID detected: "${q.id}".` };
    }
    idSet.add(q.id);

    if (!q.question || typeof q.question !== 'string' || q.question.trim() === '') {
      return { valid: false, error: `Question ${q.id} has empty question text.` };
    }

    if (!Array.isArray(q.options) || q.options.length < 2) {
      return { valid: false, error: `Question ${q.id} must have at least 2 answer options.` };
    }

    const optionIds = new Set(q.options.map((opt) => opt.id));
    if (!q.correctAnswer || !optionIds.has(q.correctAnswer)) {
      return { valid: false, error: `Question ${q.id} correct answer does not match any valid option ID.` };
    }

    if (!q.explanation || typeof q.explanation !== 'string') {
      return { valid: false, error: `Question ${q.id} must include an explanation.` };
    }
  }

  return { valid: true, pack: p as QuestionPackFile };
}
