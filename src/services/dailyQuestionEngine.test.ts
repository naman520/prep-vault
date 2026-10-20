import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDaily60Questions, hashDateStringToSeed } from './dailyQuestionEngine.ts';

test('Daily question generator returns exactly 60 questions with balanced difficulty mix', () => {
  const dateStr = '2026-10-20';
  const questions = generateDaily60Questions(dateStr);

  assert.equal(questions.length, 60, 'Must contain exactly 60 questions');

  const easy = questions.filter((q) => q.difficulty === 'easy').length;
  const medium = questions.filter((q) => q.difficulty === 'medium').length;
  const hard = questions.filter((q) => q.difficulty === 'hard').length;

  assert.equal(easy, 20, 'Must have 20 easy questions');
  assert.equal(medium, 25, 'Must have 25 medium questions');
  assert.equal(hard, 15, 'Must have 15 hard questions');
  assert.equal(easy + medium + hard, 60, 'Sum must equal 60');

  // Verify structure of every single question
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    assert.ok(q.id.startsWith(`daily-${dateStr}-`), `Question ID must match daily format: ${q.id}`);
    assert.ok(q.question.length > 10, `Question text must be substantive: ${q.question}`);
    assert.equal(q.options.length, 4, `Must have exactly 4 options: ${q.id}`);
    assert.ok(['A', 'B', 'C', 'D'].includes(q.correctAnswer), `Valid correct answer key: ${q.correctAnswer}`);
    assert.ok(q.explanation.length > 10, `Explanation must be detailed: ${q.id}`);
    assert.ok(q.categoryId, `Category ID must exist: ${q.id}`);
    assert.ok(q.topicId, `Topic ID must exist: ${q.id}`);
  }
});

test('Different dates generate different questions', () => {
  const day1 = generateDaily60Questions('2026-10-20');
  const day2 = generateDaily60Questions('2026-10-21');
  const day3 = generateDaily60Questions('2026-11-01');

  assert.equal(day1.length, 60);
  assert.equal(day2.length, 60);
  assert.equal(day3.length, 60);

  // Compare first question text across different dates
  assert.notEqual(day1[0].question, day2[0].question, 'Day 1 and Day 2 questions should differ');
  assert.notEqual(day1[0].question, day3[0].question, 'Day 1 and Day 3 questions should differ');
  assert.notEqual(day2[0].question, day3[0].question, 'Day 2 and Day 3 questions should differ');
});
