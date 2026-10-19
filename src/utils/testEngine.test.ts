import test from 'node:test';
import assert from 'node:assert/strict';
import { shuffleQuestionOptions, calculateTestResults, validateQuestionPack } from './testEngine.ts';
import type { Question } from '../types/index.ts';

const mockQuestion: Question = {
  id: 'q-test-1',
  packId: 'test-pack',
  categoryId: 'quant',
  topicId: 'percentages',
  difficulty: 'easy',
  question: 'What is 10 + 10?',
  options: [
    { id: 'A', text: '15' },
    { id: 'B', text: '20' },
    { id: 'C', text: '25' },
    { id: 'D', text: '30' },
  ],
  correctAnswer: 'B',
  explanation: '10 + 10 = 20.',
  tags: ['Math'],
};

test('shuffleQuestionOptions preserves the correct answer text across re-orderings', () => {
  const originalCorrectText = mockQuestion.options.find(o => o.id === mockQuestion.correctAnswer)?.text;
  assert.equal(originalCorrectText, '20');

  // Test across multiple runs
  for (let i = 0; i < 20; i++) {
    const { shuffledOptions, correctAnswerId } = shuffleQuestionOptions(mockQuestion, true);
    assert.equal(shuffledOptions.length, 4);
    
    // Find the option corresponding to the new correctAnswerId
    const newCorrectOption = shuffledOptions.find(o => o.id === correctAnswerId);
    assert.ok(newCorrectOption, 'Correct answer ID must exist in shuffled options');
    assert.equal(newCorrectOption?.text, '20', 'Option marked correct must hold the original correct text');
  }
});

test('calculateTestResults accurately computes correct, incorrect, and percentages', () => {
  const activeQuestions = [
    {
      questionId: 'q-1',
      originalQuestion: mockQuestion,
      shuffledOptions: mockQuestion.options,
      correctAnswerId: 'B',
      userAnswer: 'B', // Correct
      isMarkedForReview: false,
      status: 'answered' as const,
    },
    {
      questionId: 'q-2',
      originalQuestion: mockQuestion,
      shuffledOptions: mockQuestion.options,
      correctAnswerId: 'B',
      userAnswer: 'A', // Incorrect
      isMarkedForReview: false,
      status: 'answered' as const,
    },
    {
      questionId: 'q-3',
      originalQuestion: mockQuestion,
      shuffledOptions: mockQuestion.options,
      correctAnswerId: 'B',
      userAnswer: undefined, // Unanswered
      isMarkedForReview: true,
      status: 'marked_for_review' as const,
    },
    {
      questionId: 'q-4',
      originalQuestion: mockQuestion,
      shuffledOptions: mockQuestion.options,
      correctAnswerId: 'B',
      userAnswer: 'B', // Correct
      isMarkedForReview: false,
      status: 'answered' as const,
    },
  ];

  const startTime = Date.now() - 60000;
  const endTime = Date.now();
  const results = calculateTestResults(activeQuestions, startTime, endTime, 'Test Session');

  assert.equal(results.totalQuestions, 4);
  assert.equal(results.correctCount, 2);
  assert.equal(results.incorrectCount, 1);
  assert.equal(results.unansweredCount, 1);
  assert.equal(results.scorePercentage, 50); // 2 out of 4 = 50%
  assert.equal(results.timeTakenSeconds, 60);
});

test('validateQuestionPack rejects malformed JSON and detects duplicate IDs', () => {
  // Empty or invalid object
  assert.equal(validateQuestionPack(null).valid, false);
  assert.equal(validateQuestionPack({}).valid, false);

  // Missing questions
  assert.equal(validateQuestionPack({ metadata: { id: 'p1', name: 'Pack 1' }, questions: [] }).valid, false);

  // Duplicate ID detection
  const duplicatePack = {
    metadata: { id: 'p1', name: 'Pack 1' },
    questions: [
      { id: 'q1', question: 'Q1?', options: [{ id: 'A', text: '1' }, { id: 'B', text: '2' }], correctAnswer: 'A', explanation: 'exp' },
      { id: 'q1', question: 'Q2?', options: [{ id: 'A', text: '3' }, { id: 'B', text: '4' }], correctAnswer: 'B', explanation: 'exp' },
    ],
  };
  const dupResult = validateQuestionPack(duplicatePack);
  assert.equal(dupResult.valid, false);
  assert.match(dupResult.error || '', /Duplicate question ID/);

  // Valid pack
  const validPack = {
    metadata: { id: 'p1', name: 'Pack 1' },
    questions: [
      { id: 'q1', question: 'Q1?', options: [{ id: 'A', text: '1' }, { id: 'B', text: '2' }], correctAnswer: 'A', explanation: 'exp' },
      { id: 'q2', question: 'Q2?', options: [{ id: 'A', text: '3' }, { id: 'B', text: '4' }], correctAnswer: 'B', explanation: 'exp' },
    ],
  };
  assert.equal(validateQuestionPack(validPack).valid, true);
});
