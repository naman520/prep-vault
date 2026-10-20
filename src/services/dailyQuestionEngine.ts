import type { Question, QuestionOption, Difficulty } from '../types';

/**
 * Seeded PRNG (Mulberry32) for deterministic, high-quality question generation per date.
 */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Returns float [0, 1)
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Integer [min, max]
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Pick one from array
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // Shuffle array copy
  shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

/**
 * Converts date string YYYY-MM-DD into a 32-bit integer seed
 */
export function hashDateStringToSeed(dateStr: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Helper to construct an option set with A, B, C, D identifiers
 */
function makeOptions(
  rng: SeededRandom,
  correctText: string,
  distractors: string[]
): { options: QuestionOption[]; correctAnswer: string } {
  const chosenDistractors = rng.shuffle(distractors).slice(0, 3);
  const rawList = [
    { text: correctText, isCorrect: true },
    { text: chosenDistractors[0], isCorrect: false },
    { text: chosenDistractors[1], isCorrect: false },
    { text: chosenDistractors[2], isCorrect: false },
  ];

  const shuffled = rng.shuffle(rawList);
  const ids = ['A', 'B', 'C', 'D'];
  const options: QuestionOption[] = shuffled.map((item, index) => ({
    id: ids[index],
    text: item.text,
  }));

  const correctIndex = shuffled.findIndex((item) => item.isCorrect);
  return {
    options,
    correctAnswer: ids[correctIndex],
  };
}

// ---------------------------------------------------------------------------
// 1. QUANTITATIVE APTITUDE GENERATORS (15 questions: 5 Easy, 6 Medium, 4 Hard)
// ---------------------------------------------------------------------------
function generateQuantQuestions(rng: SeededRandom, dateStr: string, packId: string): Question[] {
  const list: Question[] = [];

  // Q1: Percentages - Easy
  {
    const totalMarks = rng.pick([200, 300, 400, 500, 600]);
    const passPercent = rng.pick([35, 40, 45, 50]);
    const passMarks = (totalMarks * passPercent) / 100;
    const { options, correctAnswer } = makeOptions(
      rng,
      `${passMarks} marks`,
      [`${passMarks - 15} marks`, `${passMarks + 20} marks`, `${passMarks - 30} marks`, `${passMarks + 10} marks`]
    );
    list.push({
      id: `daily-${dateStr}-quant-1`,
      packId,
      categoryId: 'quant',
      topicId: 'percentages',
      difficulty: 'easy',
      question: `In an annual qualifying examination, the passing criterion is ${passPercent}% of the total marks. If the total maximum marks are ${totalMarks}, how many marks must a student obtain to pass?`,
      options,
      correctAnswer,
      explanation: `Passing marks = Total Marks × (Passing Percentage / 100)\n= ${totalMarks} × (${passPercent} / 100) = ${passMarks} marks.`,
      hints: ['Multiply total marks by the percentage fraction.'],
      tags: ['DailyChallenge', 'Percentages', 'Arithmetic'],
    });
  }

  // Q2: Percentages - Successive change - Medium
  {
    const p1 = rng.pick([10, 20, 25, 30]);
    const p2 = rng.pick([10, 15, 20]);
    // Increase by p1% then decrease by p2%
    // Net = p1 - p2 - (p1 * p2) / 100
    const net = p1 - p2 - (p1 * p2) / 100;
    const isGain = net >= 0;
    const absNet = Math.abs(net);
    const correctStr = `${absNet}% ${isGain ? 'increase' : 'decrease'}`;
    const { options, correctAnswer } = makeOptions(
      rng,
      correctStr,
      [
        `${(p1 - p2)}% increase`,
        `${(p1 + p2)}% increase`,
        `${absNet + 2}% ${isGain ? 'increase' : 'decrease'}`,
        `${absNet - 1.5}% decrease`,
      ]
    );
    list.push({
      id: `daily-${dateStr}-quant-2`,
      packId,
      categoryId: 'quant',
      topicId: 'percentages',
      difficulty: 'medium',
      question: `The price of a digital tablet was first increased by ${p1}% and subsequently reduced by ${p2}% due to market competition. What is the overall net percentage change in the price of the tablet?`,
      options,
      correctAnswer,
      explanation: `Using the successive percentage formula: Net Change = a + b + (ab / 100)\nHere a = +${p1}%, b = -${p2}%\nNet Change = ${p1} - ${p2} + (${p1} × (-${p2}) / 100) = ${p1 - p2} - ${(p1 * p2) / 100} = ${net}%\nSince the sign is ${isGain ? 'positive' : 'negative'}, there is an overall ${correctStr}.`,
      hints: ['Apply the formula: a + b + (ab/100).'],
      tags: ['DailyChallenge', 'Percentages', 'SuccessiveChange'],
    });
  }

  // Q3: Profit and Loss - Easy
  {
    const cp = rng.pick([400, 500, 600, 800, 1200]);
    const profitPct = rng.pick([15, 20, 25, 30]);
    const profit = (cp * profitPct) / 100;
    const sp = cp + profit;
    const { options, correctAnswer } = makeOptions(
      rng,
      `₹${sp}`,
      [`₹${sp - 40}`, `₹${sp + 50}`, `₹${cp + profitPct * 2}`, `₹${sp - 80}`]
    );
    list.push({
      id: `daily-${dateStr}-quant-3`,
      packId,
      categoryId: 'quant',
      topicId: 'profit-and-loss',
      difficulty: 'easy',
      question: `A retailer purchases an ergonomic desk chair for ₹${cp} and sells it at a profit margin of ${profitPct}%. What is the selling price of the chair?`,
      options,
      correctAnswer,
      explanation: `Profit = ${profitPct}% of ₹${cp} = (${profitPct} / 100) × ${cp} = ₹${profit}.\nSelling Price (SP) = Cost Price (CP) + Profit = ₹${cp} + ₹${profit} = ₹${sp}.`,
      hints: ['SP = CP × (1 + Profit%/100)'],
      tags: ['DailyChallenge', 'ProfitAndLoss'],
    });
  }

  // Q4: Profit and Loss - Discount on Marked Price - Medium
  {
    const cp = rng.pick([800, 1000, 1500, 2000]);
    const markupPct = 50;
    const mp = cp * 1.5;
    const discountPct = 20;
    const sp = mp * 0.8;
    const profit = sp - cp;
    const profitPercent = Math.round((profit / cp) * 100);
    const { options, correctAnswer } = makeOptions(
      rng,
      `${profitPercent}% profit`,
      [`${profitPercent + 10}% profit`, `${markupPct - discountPct}% profit`, `15% loss`, `${profitPercent - 5}% profit`]
    );
    list.push({
      id: `daily-${dateStr}-quant-4`,
      packId,
      categoryId: 'quant',
      topicId: 'profit-and-loss',
      difficulty: 'medium',
      question: `A merchant marks his inventory 50% above the cost price (CP) of ₹${cp} and then allows a promotional cash discount of 20% on the marked price. What is the merchant's net profit percentage?`,
      options,
      correctAnswer,
      explanation: `Let CP = ₹${cp}.\nMarked Price (MP) = ${cp} + 50% of ${cp} = ₹${mp}.\nSelling Price (SP) = MP - 20% discount = ${mp} - (0.20 × ${mp}) = ₹${sp}.\nProfit = SP - CP = ₹${sp} - ₹${cp} = ₹${profit}.\nProfit Percentage = (Profit / CP) × 100 = (${profit} / ${cp}) × 100 = ${profitPercent}%.`,
      hints: ['Discount is always calculated on the Marked Price, while Profit is calculated on Cost Price.'],
      tags: ['DailyChallenge', 'ProfitAndLoss', 'MarkedPrice'],
    });
  }

  // Q5: Simple Interest - Easy
  {
    const p = rng.pick([5000, 6000, 8000, 10000, 12000]);
    const r = rng.pick([5, 6, 8, 10]);
    const t = rng.pick([2, 3, 4, 5]);
    const si = (p * r * t) / 100;
    const total = p + si;
    const { options, correctAnswer } = makeOptions(
      rng,
      `₹${si}`,
      [`₹${si + 200}`, `₹${si - 150}`, `₹${si + 450}`, `₹${p * 0.1}`]
    );
    list.push({
      id: `daily-${dateStr}-quant-5`,
      packId,
      categoryId: 'quant',
      topicId: 'simple-and-compound-interest',
      difficulty: 'easy',
      question: `What will be the simple interest accrued on a principal deposit of ₹${p} at an annual interest rate of ${r}% over a duration of ${t} years?`,
      options,
      correctAnswer,
      explanation: `Simple Interest (SI) = (P × R × T) / 100\n= (${p} × ${r} × ${t}) / 100 = ₹${si}.`,
      hints: ['Use the fundamental SI formula: (P × R × T) / 100.'],
      tags: ['DailyChallenge', 'SimpleInterest'],
    });
  }

  // Q6: Compound vs Simple Interest Difference - Hard
  {
    const p = rng.pick([10000, 15000, 20000, 25000]);
    const r = rng.pick([8, 10, 12]);
    // For 2 years, diff = P * (R/100)^2
    const diff = Math.round(p * Math.pow(r / 100, 2));
    const { options, correctAnswer } = makeOptions(
      rng,
      `₹${diff}`,
      [`₹${diff + 40}`, `₹${diff - 30}`, `₹${Math.round(diff * 1.5)}`, `₹${diff + 100}`]
    );
    list.push({
      id: `daily-${dateStr}-quant-6`,
      packId,
      categoryId: 'quant',
      topicId: 'simple-and-compound-interest',
      difficulty: 'hard',
      question: `Find the exact difference between the Compound Interest (compounded annually) and Simple Interest on a principal sum of ₹${p} for 2 years at an interest rate of ${r}% per annum.`,
      options,
      correctAnswer,
      explanation: `For 2 years, the difference between Compound Interest (CI) and Simple Interest (SI) is given by the formula:\nDifference = P × (R / 100)²\n= ${p} × (${r} / 100)²\n= ${p} × (${(r * r) / 10000})\n= ₹${diff}.`,
      hints: ['For 2 years, CI - SI = P(R/100)².'],
      tags: ['DailyChallenge', 'CompoundInterest', 'AdvancedArithmetic'],
    });
  }

  // Q7: Time and Work - Easy
  {
    // A takes 12 days, B takes 24 days -> together = (12 * 24)/(12 + 24) = 8
    const pairs = [
      { a: 10, b: 15, ans: 6 },
      { a: 12, b: 24, ans: 8 },
      { a: 20, b: 30, ans: 12 },
      { a: 15, b: 30, ans: 10 },
      { a: 6, b: 12, ans: 4 },
    ];
    const item = rng.pick(pairs);
    const { options, correctAnswer } = makeOptions(
      rng,
      `${item.ans} days`,
      [`${item.ans + 2} days`, `${item.ans - 1} days`, `${Math.round((item.a + item.b) / 2)} days`, `${item.ans + 4} days`]
    );
    list.push({
      id: `daily-${dateStr}-quant-7`,
      packId,
      categoryId: 'quant',
      topicId: 'time-and-work',
      difficulty: 'easy',
      question: `Person A can complete a software module in ${item.a} days, and Person B can complete the same module in ${item.b} days. If both work together collaboratively, how many days will they take to complete the module?`,
      options,
      correctAnswer,
      explanation: `Rate of A = 1/${item.a} per day.\nRate of B = 1/${item.b} per day.\nCombined daily rate = (1/${item.a}) + (1/${item.b}) = (${item.b} + ${item.a}) / (${item.a} × ${item.b}) = ${item.a + item.b} / ${item.a * item.b} = 1/${item.ans}.\nTherefore, together they finish in ${item.ans} days.`,
      hints: ['Combined time = (A × B) / (A + B).'],
      tags: ['DailyChallenge', 'TimeAndWork'],
    });
  }

  // Q8: Time and Work - Three Workers - Medium
  {
    // A, B, C can do work in 12, 15, 20 days. LCM = 60. Eff = 5 + 4 + 3 = 12. 60/12 = 5 days.
    const { options, correctAnswer } = makeOptions(
      rng,
      '5 days',
      ['4 days', '6 days', '7.5 days', '8 days']
    );
    list.push({
      id: `daily-${dateStr}-quant-8`,
      packId,
      categoryId: 'quant',
      topicId: 'time-and-work',
      difficulty: 'medium',
      question: `Three engineers A, B, and C can complete a cloud migration project individually in 12 days, 15 days, and 20 days respectively. If all three work together continuously, in how many days will the project be finished?`,
      options,
      correctAnswer,
      explanation: `Let total work = LCM(12, 15, 20) = 60 units.\nEfficiency of A = 60 / 12 = 5 units/day.\nEfficiency of B = 60 / 15 = 4 units/day.\nEfficiency of C = 60 / 20 = 3 units/day.\nCombined efficiency = 5 + 4 + 3 = 12 units/day.\nTotal time taken = 60 / 12 = 5 days.`,
      hints: ['Use the LCM method to assign total units of work.'],
      tags: ['DailyChallenge', 'TimeAndWork', 'LCMWorkMethod'],
    });
  }

  // Q9: Time, Speed and Distance - Train crossing pole - Easy
  {
    const speedKmh = rng.pick([54, 72, 90, 108]);
    const speedMs = (speedKmh * 5) / 18;
    const lengthM = rng.pick([150, 200, 250, 300]);
    const timeSec = (lengthM / speedMs).toFixed(1);
    const { options, correctAnswer } = makeOptions(
      rng,
      `${timeSec} seconds`,
      [`${(parseFloat(timeSec) + 3).toFixed(1)} seconds`, `${(parseFloat(timeSec) - 2).toFixed(1)} seconds`, `${(parseFloat(timeSec) * 1.5).toFixed(1)} seconds`, `${(parseFloat(timeSec) + 5).toFixed(1)} seconds`]
    );
    list.push({
      id: `daily-${dateStr}-quant-9`,
      packId,
      categoryId: 'quant',
      topicId: 'time-speed-and-distance',
      difficulty: 'easy',
      question: `A high-speed train measuring ${lengthM} meters in length is traveling at a uniform speed of ${speedKmh} km/h. How many seconds will it take to completely pass a stationary electric pole?`,
      options,
      correctAnswer,
      explanation: `Convert speed from km/h to m/s:\nSpeed = ${speedKmh} × (5 / 18) = ${speedMs} m/s.\nTo cross a stationary point object (pole), distance = train's length = ${lengthM} m.\nTime = Distance / Speed = ${lengthM} / ${speedMs} = ${timeSec} seconds.`,
      hints: ['Multiply km/h by 5/18 to get m/s.'],
      tags: ['DailyChallenge', 'TimeSpeedDistance', 'Trains'],
    });
  }

  // Q10: Time, Speed and Distance - Average Speed - Medium
  {
    const x = rng.pick([40, 60, 30]);
    const y = rng.pick([60, 90, 45]);
    const avgSpeed = Math.round((2 * x * y) / (x + y));
    const { options, correctAnswer } = makeOptions(
      rng,
      `${avgSpeed} km/h`,
      [`${Math.round((x + y) / 2)} km/h`, `${avgSpeed + 4} km/h`, `${avgSpeed - 5} km/h`, `${x + 10} km/h`]
    );
    list.push({
      id: `daily-${dateStr}-quant-10`,
      packId,
      categoryId: 'quant',
      topicId: 'time-speed-and-distance',
      difficulty: 'medium',
      question: `A motorist travels from Town A to Town B at a constant speed of ${x} km/h and returns along the identical route from Town B to Town A at a speed of ${y} km/h. What is the average speed of the vehicle for the entire round trip?`,
      options,
      correctAnswer,
      explanation: `When equal distances are traversed at speeds x and y, the harmonic average speed is given by:\nAverage Speed = (2 × x × y) / (x + y)\n= (2 × ${x} × ${y}) / (${x} + ${y}) = ${2 * x * y} / ${x + y} = ${avgSpeed} km/h.\nNote: The arithmetic mean (${(x + y) / 2} km/h) is an incorrect distractor because time spent at slower speed is higher.`,
      hints: ['Average speed = 2xy / (x + y) when distances are equal.'],
      tags: ['DailyChallenge', 'TimeSpeedDistance', 'AverageSpeed'],
    });
  }

  // Q11: Ratio and Proportion - Easy
  {
    const r1 = rng.pick([3, 4, 5]);
    const r2 = rng.pick([5, 7, 9]);
    const unit = rng.pick([150, 200, 300, 400]);
    const total = (r1 + r2) * unit;
    const share1 = r1 * unit;
    const share2 = r2 * unit;
    const { options, correctAnswer } = makeOptions(
      rng,
      `₹${share1} and ₹${share2}`,
      [
        `₹${share1 - 100} and ₹${share2 + 100}`,
        `₹${share2} and ₹${share1}`,
        `₹${share1 + 200} and ₹${share2 - 200}`,
        `₹${Math.round(total / 2)} and ₹${Math.round(total / 2)}`,
      ]
    );
    list.push({
      id: `daily-${dateStr}-quant-11`,
      packId,
      categoryId: 'quant',
      topicId: 'ratio-and-proportion',
      difficulty: 'medium',
      question: `An annual team bonus of ₹${total} is distributed between Senior Developer A and Developer B in the ratio ${r1} : ${r2}. What are their respective bonus shares?`,
      options,
      correctAnswer,
      explanation: `Total ratio parts = ${r1} + ${r2} = ${r1 + r2}.\nValue of 1 part = ₹${total} / ${r1 + r2} = ₹${unit}.\nShare of A = ${r1} × ₹${unit} = ₹${share1}.\nShare of B = ${r2} × ₹${unit} = ₹${share2}.`,
      hints: ['Divide the total by the sum of ratio parts.'],
      tags: ['DailyChallenge', 'RatioAndProportion'],
    });
  }

  // Q12: Averages - Medium
  {
    const n = rng.pick([15, 20, 25, 30]);
    const avg = rng.pick([45, 50, 52]);
    const teacherWeight = rng.pick([65, 70, 75, 80]);
    const newTotal = n * avg + teacherWeight;
    const newAvg = (newTotal / (n + 1)).toFixed(2);
    const increase = (parseFloat(newAvg) - avg).toFixed(2);
    const { options, correctAnswer } = makeOptions(
      rng,
      `${newAvg} kg`,
      [`${(parseFloat(newAvg) + 1.5).toFixed(2)} kg`, `${(parseFloat(newAvg) - 1.2).toFixed(2)} kg`, `${avg + 2} kg`, `${(parseFloat(newAvg) + 3).toFixed(2)} kg`]
    );
    list.push({
      id: `daily-${dateStr}-quant-12`,
      packId,
      categoryId: 'quant',
      topicId: 'averages',
      difficulty: 'medium',
      question: `The average weight of a class of ${n} students is ${avg} kg. If the class teacher with a weight of ${teacherWeight} kg is also included, what is the new average weight of the group?`,
      options,
      correctAnswer,
      explanation: `Total weight of ${n} students = ${n} × ${avg} = ${n * avg} kg.\nWith teacher included, new total weight = ${n * avg} + ${teacherWeight} = ${newTotal} kg.\nNew total count = ${n + 1} individuals.\nNew Average = ${newTotal} / ${n + 1} = ${newAvg} kg (an increase of ${increase} kg).`,
      hints: ['Calculate the new total sum and divide by (n + 1).'],
      tags: ['DailyChallenge', 'Averages'],
    });
  }

  // Q13: Number Systems - Remainder - Medium
  {
    const base = rng.pick([2, 3, 7]);
    const power = rng.pick([35, 41, 53, 67]);
    const mod = 5;
    // Compute remainder base^power mod 5
    // Cycle mod 5:
    let r = 1;
    for (let i = 0; i < power; i++) {
      r = (r * base) % mod;
    }
    const { options, correctAnswer } = makeOptions(
      rng,
      `${r}`,
      [`${(r + 1) % mod || 4}`, `${(r + 2) % mod || 3}`, `${(r + 3) % mod || 2}`, '0']
    );
    list.push({
      id: `daily-${dateStr}-quant-13`,
      packId,
      categoryId: 'quant',
      topicId: 'number-systems',
      difficulty: 'medium',
      question: `What is the remainder when ${base}^${power} is divided by ${mod}?`,
      options,
      correctAnswer,
      explanation: `Find the cyclicity of powers of ${base} modulo ${mod}:\nFor base ${base}, powers modulo 5 cycle every 4 powers (Euler's Totient φ(5) = 4).\n${power} mod 4 = ${power % 4}.\n${base}^${power % 4 === 0 ? 4 : power % 4} mod 5 = ${r}.\nTherefore, remainder is ${r}.`,
      hints: ['Use modular cyclicity or Fermat’s Little Theorem.'],
      tags: ['DailyChallenge', 'NumberSystems', 'Remainders'],
    });
  }

  // Q14: Probability - Hard
  {
    // Two dice rolled, sum is a prime number (2, 3, 5, 7, 11)
    // Counts: sum=2 (1), sum=3 (2), sum=5 (4), sum=7 (6), sum=11 (2) -> Total = 1 + 2 + 4 + 6 + 2 = 15 out of 36 = 15/36 = 5/12
    const { options, correctAnswer } = makeOptions(
      rng,
      '5/12',
      ['1/2', '7/18', '11/36', '1/3']
    );
    list.push({
      id: `daily-${dateStr}-quant-14`,
      packId,
      categoryId: 'quant',
      topicId: 'probability',
      difficulty: 'hard',
      question: `Two fair six-sided dice are rolled simultaneously. What is the exact mathematical probability that the sum of the numbers appearing on the top faces is a prime number?`,
      options,
      correctAnswer,
      explanation: `Total possible outcomes when rolling 2 dice = 6 × 6 = 36.\nPossible prime sums between 2 and 12 are: {2, 3, 5, 7, 11}.\nFavorable outcomes for each sum:\n- Sum = 2: (1,1) -> 1\n- Sum = 3: (1,2), (2,1) -> 2\n- Sum = 5: (1,4), (2,3), (3,2), (4,1) -> 4\n- Sum = 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) -> 6\n- Sum = 11: (5,6), (6,5) -> 2\nTotal favorable outcomes = 1 + 2 + 4 + 6 + 2 = 15.\nProbability = 15 / 36 = 5 / 12.`,
      hints: ['List favorable pairs for each prime sum: 2, 3, 5, 7, 11.'],
      tags: ['DailyChallenge', 'Probability', 'DiceOutcomes'],
    });
  }

  // Q15: Pipes and Cisterns - Hard
  {
    // Pipe A fills in 10h, Pipe B in 15h, Pipe C empties in 30h.
    // Rates: 1/10 + 1/15 - 1/30 = (3 + 2 - 1)/30 = 4/30 = 2/15 -> 15/2 = 7.5 hours
    const { options, correctAnswer } = makeOptions(
      rng,
      '7.5 hours',
      ['6 hours', '8 hours', '9.5 hours', '10 hours']
    );
    list.push({
      id: `daily-${dateStr}-quant-15`,
      packId,
      categoryId: 'quant',
      topicId: 'pipes-and-cisterns',
      difficulty: 'hard',
      question: `Pipe A and Pipe B can fill an overhead water cistern in 10 hours and 15 hours respectively. A drainage waste pipe C at the bottom can empty the completely full cistern in 30 hours. If all three pipes are opened simultaneously when the cistern is empty, how long will it take to fill the cistern completely?`,
      options,
      correctAnswer,
      explanation: `Part filled by A in 1 hour = +1/10\nPart filled by B in 1 hour = +1/15\nPart emptied by C in 1 hour = -1/30\nNet part filled per hour = (1/10) + (1/15) - (1/30)\nLCM(10, 15, 30) = 30.\n= (3 + 2 - 1) / 30 = 4 / 30 = 2 / 15.\nTime required to fill completely = 15 / 2 = 7.5 hours (7 hours and 30 minutes).`,
      hints: ['Add inlet rates and subtract the outlet drainage rate.'],
      tags: ['DailyChallenge', 'PipesAndCisterns'],
    });
  }

  return list;
}

// ---------------------------------------------------------------------------
// 2. LOGICAL REASONING GENERATORS (13 questions: 4 Easy, 6 Medium, 3 Hard)
// ---------------------------------------------------------------------------
function generateReasoningQuestions(rng: SeededRandom, dateStr: string, packId: string): Question[] {
  const list: Question[] = [];

  // Q1: Number Series - Easy (Arithmetic Progression)
  {
    const start = rng.pick([7, 12, 15, 23]);
    const diff = rng.pick([6, 7, 8, 9]);
    const s = [start, start + diff, start + 2 * diff, start + 3 * diff, start + 4 * diff];
    const nextVal = start + 5 * diff;
    const { options, correctAnswer } = makeOptions(
      rng,
      `${nextVal}`,
      [`${nextVal - diff}`, `${nextVal + diff}`, `${nextVal + 2}`, `${nextVal - 3}`]
    );
    list.push({
      id: `daily-${dateStr}-reason-1`,
      packId,
      categoryId: 'reasoning',
      topicId: 'number-series',
      difficulty: 'easy',
      question: `Identify the missing number that logically completes the following numeric sequence:\n${s.join(', ')}, ?`,
      options,
      correctAnswer,
      explanation: `The series follows an Arithmetic Progression with a common positive difference of +${diff}:\n${s[0]} + ${diff} = ${s[1]}\n${s[1]} + ${diff} = ${s[2]}\n${s[2]} + ${diff} = ${s[3]}\n${s[3]} + ${diff} = ${s[4]}\nNext term = ${s[4]} + ${diff} = ${nextVal}.`,
      hints: ['Examine the common difference between consecutive terms.'],
      tags: ['DailyChallenge', 'NumberSeries', 'ArithmeticProgression'],
    });
  }

  // Q2: Number Series - Medium (Squares offset)
  {
    const offset = rng.pick([1, 2, -1]);
    const terms = [2, 3, 4, 5, 6].map((x) => x * x + offset);
    const nextVal = 7 * 7 + offset;
    const { options, correctAnswer } = makeOptions(
      rng,
      `${nextVal}`,
      [`${nextVal + 4}`, `${nextVal - 5}`, `${7 * 7}`, `${nextVal + 10}`]
    );
    list.push({
      id: `daily-${dateStr}-reason-2`,
      packId,
      categoryId: 'reasoning',
      topicId: 'number-series',
      difficulty: 'medium',
      question: `Find the next logical term in the sequence:\n${terms.join(', ')}, ?`,
      options,
      correctAnswer,
      explanation: `Pattern analysis: each term is (n² ${offset >= 0 ? '+' : '-'} ${Math.abs(offset)}) starting from n = 2:\n2² ${offset >= 0 ? '+' : '-'} ${Math.abs(offset)} = ${terms[0]}\n3² ${offset >= 0 ? '+' : '-'} ${Math.abs(offset)} = ${terms[1]}\n4² ${offset >= 0 ? '+' : '-'} ${Math.abs(offset)} = ${terms[2]}\n5² ${offset >= 0 ? '+' : '-'} ${Math.abs(offset)} = ${terms[3]}\n6² ${offset >= 0 ? '+' : '-'} ${Math.abs(offset)} = ${terms[4]}\nNext term = 7² ${offset >= 0 ? '+' : '-'} ${Math.abs(offset)} = 49 ${offset >= 0 ? '+' : '-'} ${Math.abs(offset)} = ${nextVal}.`,
      hints: ['Compare each number to nearby perfect square integers.'],
      tags: ['DailyChallenge', 'NumberSeries', 'SquarePatterns'],
    });
  }

  // Q3: Number Series - Hard (Alternating Operations)
  {
    // Start with 3, *2 + 1, *2 - 1, *2 + 1, *2 - 1
    const a1 = 3;
    const a2 = a1 * 2 + 1; // 7
    const a3 = a2 * 2 - 1; // 13
    const a4 = a3 * 2 + 1; // 27
    const a5 = a4 * 2 - 1; // 53
    const a6 = a5 * 2 + 1; // 107
    const { options, correctAnswer } = makeOptions(
      rng,
      `${a6}`,
      [`${a6 - 2}`, `${a6 + 4}`, '105', '112']
    );
    list.push({
      id: `daily-${dateStr}-reason-3`,
      packId,
      categoryId: 'reasoning',
      topicId: 'number-series',
      difficulty: 'hard',
      question: `Find the next number in this sequence:\n${a1}, ${a2}, ${a3}, ${a4}, ${a5}, ?`,
      options,
      correctAnswer,
      explanation: `The sequence alternates operations:\n3 × 2 + 1 = 7\n7 × 2 - 1 = 13\n13 × 2 + 1 = 27\n27 × 2 - 1 = 53\nFollowing the alternating rule (× 2 + 1):\n53 × 2 + 1 = 106 + 1 = ${a6}.`,
      hints: ['Notice the alternating +1 and -1 operations following multiplication by 2.'],
      tags: ['DailyChallenge', 'NumberSeries', 'AlternatingPattern'],
    });
  }

  // Q4: Coding and Decoding - Easy
  {
    const shift = 2; // +2 shift
    // CAT -> ECV
    // DOG -> FQI
    const words = [
      { plain: 'ROSE', code: 'TQUG', test: 'BLUE', testCode: 'DNWG' },
      { plain: 'GOLD', code: 'IQNF', test: 'SILK', testCode: 'UKNM' },
      { plain: 'JAVA', code: 'LCXC', test: 'NODE', testCode: 'PQFG' },
    ];
    const item = rng.pick(words);
    const { options, correctAnswer } = makeOptions(
      rng,
      item.testCode,
      [
        item.testCode.slice(0, 3) + 'H',
        item.testCode.slice(0, 2) + 'VF',
        item.testCode.split('').reverse().join(''),
        'EMXG',
      ]
    );
    list.push({
      id: `daily-${dateStr}-reason-4`,
      packId,
      categoryId: 'reasoning',
      topicId: 'coding-and-decoding',
      difficulty: 'easy',
      question: `In a certain cipher code language, "${item.plain}" is written as "${item.code}". How will the word "${item.test}" be encoded in that identical cipher system?`,
      options,
      correctAnswer,
      explanation: `Each letter of the word is shifted forward by +${shift} alphabetical positions:\nFor "${item.test}":\n${item.test.split('').map((c) => `${c} (+2) -> ${String.fromCharCode(c.charCodeAt(0) + 2)}`).join('\n')}\nResulting cipher code: "${item.testCode}".`,
      hints: ['Count how many letters forward each character has been shifted.'],
      tags: ['DailyChallenge', 'CodingDecoding', 'CaesarShift'],
    });
  }

  // Q5: Coding and Decoding - Medium (Opposite Alphabet)
  {
    // A<->Z, B<->Y, C<->X, etc.
    const { options, correctAnswer } = makeOptions(
      rng,
      'ZNZM',
      ['YMYL', 'AOAN', 'XMXL', 'ZMZN']
    );
    list.push({
      id: `daily-${dateStr}-reason-5`,
      packId,
      categoryId: 'reasoning',
      topicId: 'coding-and-decoding',
      difficulty: 'medium',
      question: `If "HAND" is encoded as "SZMW" by mapping each letter to its complementary opposite letter in the 26-letter English alphabet (A↔Z, B↔Y, C↔X, etc.), how will "AMAN" be encoded?`,
      options,
      correctAnswer,
      explanation: `Complementary pairs have alphabetical sum of 27:\nA (1) ↔ Z (26)\nM (13) ↔ N (14)\nA (1) ↔ Z (26)\nN (14) ↔ M (13)\nHence, AMAN is encoded as ZNZM.`,
      hints: ['Use the formula: Opposite Rank = 27 - Current Rank.'],
      tags: ['DailyChallenge', 'CodingDecoding', 'ReverseAlphabet'],
    });
  }

  // Q6: Blood Relations - Easy
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Brother',
      ['Father', 'Cousin', 'Uncle', 'Son']
    );
    list.push({
      id: `daily-${dateStr}-reason-6`,
      packId,
      categoryId: 'reasoning',
      topicId: 'blood-relations',
      difficulty: 'easy',
      question: `Pointing to a boy in a photograph, Rohit said, "He is the only son of the only son of my grandfather." How is the boy related to Rohit?`,
      options,
      correctAnswer,
      explanation: `"Only son of my grandfather" = Rohit's father.\n"The only son of Rohit's father" = Rohit himself (or Rohit's brother).\nSince Rohit is pointing to the boy as his counterpart, the boy is Rohit himself or his brother. In standard options, Rohit's brother (or Rohit himself) is the answer.`,
      hints: ['Break down from the end: Grandfather’s only son is Father.'],
      tags: ['DailyChallenge', 'BloodRelations'],
    });
  }

  // Q7: Blood Relations - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Grandson',
      ['Son', 'Nephew', 'Brother', 'Grandfather']
    );
    list.push({
      id: `daily-${dateStr}-reason-7`,
      packId,
      categoryId: 'reasoning',
      topicId: 'blood-relations',
      difficulty: 'medium',
      question: `A is the mother of B. C is the son of A. D is the brother of E. E is the daughter of B. Who is the grandson of A?`,
      options,
      correctAnswer,
      explanation: `A is the mother of B and C.\nE is the daughter of B.\nD is the brother of E, which means D is the son of B.\nSince D is the son of A's child (B), D is the grandson of A.`,
      hints: ['Draw a quick family tree diagram across the two generations.'],
      tags: ['DailyChallenge', 'BloodRelations', 'FamilyTree'],
    });
  }

  // Q8: Direction Sense - Easy
  {
    const northDist = rng.pick([6, 8, 9, 12]);
    const eastDist = rng.pick([8, 6, 12, 16]);
    const straightDist = Math.round(Math.sqrt(northDist * northDist + eastDist * eastDist));
    const { options, correctAnswer } = makeOptions(
      rng,
      `${straightDist} km North-East`,
      [`${straightDist + 2} km East`, `${northDist + eastDist} km North-East`, `${straightDist} km North-West`, `${straightDist - 1} km South-East`]
    );
    list.push({
      id: `daily-${dateStr}-reason-8`,
      packId,
      categoryId: 'reasoning',
      topicId: 'direction-sense',
      difficulty: 'easy',
      question: `A delivery agent starts from the distribution hub, drives ${northDist} km North, turns right (East), and drives ${eastDist} km. What is the shortest straight-line distance and compass direction from the starting hub?`,
      options,
      correctAnswer,
      explanation: `The path forms a right-angled triangle where the legs are ${northDist} km and ${eastDist} km.\nBy Pythagoras' theorem:\nDistance = √(${northDist}² + ${eastDist}²) = √(${northDist * northDist} + ${eastDist * eastDist}) = √(${northDist * northDist + eastDist * eastDist}) = ${straightDist} km.\nSince he moved North and then East, his relative direction is North-East.`,
      hints: ['Use the Pythagorean theorem: a² + b² = c².'],
      tags: ['DailyChallenge', 'DirectionSense', 'Pythagoras'],
    });
  }

  // Q9: Direction Sense - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'South-West',
      ['North-East', 'South-East', 'North-West', 'West']
    );
    list.push({
      id: `daily-${dateStr}-reason-9`,
      packId,
      categoryId: 'reasoning',
      topicId: 'direction-sense',
      difficulty: 'medium',
      question: `A person is standing facing North. He rotates 90° clockwise, then 180° counter-clockwise, and finally 135° counter-clockwise. Which direction is he facing now?`,
      options,
      correctAnswer,
      explanation: `Initial facing: North (0°).\n1. Rotate 90° clockwise: 0° + 90° = 90° (East).\n2. Rotate 180° counter-clockwise: 90° - 180° = -90° or 270° (West).\n3. Rotate 135° counter-clockwise: 270° - 135° = 135° from North going counter-clockwise (or 225° clockwise).\n225° clockwise from North corresponds to South-West.`,
      hints: ['Sum the net angular displacement: (+90° - 180° - 135° = -225°).'],
      tags: ['DailyChallenge', 'DirectionSense', 'AnglesOfTurn'],
    });
  }

  // Q10: Analogies - Easy
  {
    const analogies = [
      { a: 'Odometer', b: 'Distance', c: 'Barometer', ans: 'Atmospheric Pressure', distract: ['Speed', 'Humidity', 'Temperature'] },
      { a: 'Anemometer', b: 'Wind Speed', c: 'Seismograph', ans: 'Earthquakes', distract: ['Rainfall', 'Ocean Currents', 'Air Pressure'] },
      { a: 'Cardiologist', b: 'Heart', c: 'Nephrologist', ans: 'Kidney', distract: ['Brain', 'Lungs', 'Bones'] },
    ];
    const item = rng.pick(analogies);
    const { options, correctAnswer } = makeOptions(
      rng,
      item.ans,
      item.distract
    );
    list.push({
      id: `daily-${dateStr}-reason-10`,
      packId,
      categoryId: 'reasoning',
      topicId: 'analogies',
      difficulty: 'medium',
      question: `Complete the semantic analogy:\n${item.a} : ${item.b} :: ${item.c} : ?`,
      options,
      correctAnswer,
      explanation: `An ${item.a} is an instrument designed to measure ${item.b}. Similarly, a ${item.c} is an instrument designed to measure ${item.ans}.`,
      hints: ['Identify the exact relationship between the first pair of terms.'],
      tags: ['DailyChallenge', 'Analogies', 'ScientificInstruments'],
    });
  }

  // Q11: Syllogisms - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Only Conclusion I follows',
      ['Only Conclusion II follows', 'Both Conclusion I and II follow', 'Neither Conclusion I nor II follows']
    );
    list.push({
      id: `daily-${dateStr}-reason-11`,
      packId,
      categoryId: 'reasoning',
      topicId: 'syllogisms',
      difficulty: 'hard',
      question: `Given the statements:\n1. All laptops are electronic gadgets.\n2. All electronic gadgets emit radiation.\n\nConclusions:\nI. All laptops emit radiation.\nII. All items that emit radiation are laptops.`,
      options,
      correctAnswer,
      explanation: `Let L = Laptops, E = Electronic gadgets, R = Items that emit radiation.\nStatement 1: L ⊆ E.\nStatement 2: E ⊆ R.\nCombining them yields L ⊆ R, which validates Conclusion I ("All laptops emit radiation").\nHowever, R ⊆ L does not follow (the universal converse is invalid), so Conclusion II is invalid.`,
      hints: ['Check subset inclusions: If A ⊆ B and B ⊆ C, then A ⊆ C.'],
      tags: ['DailyChallenge', 'Syllogisms', 'DeductiveLogic'],
    });
  }

  // Q12: Statement and Conclusion - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Neither conclusion follows with certainty',
      ['Only conclusion I follows', 'Only conclusion II follows', 'Both conclusions follow']
    );
    list.push({
      id: `daily-${dateStr}-reason-12`,
      packId,
      categoryId: 'reasoning',
      topicId: 'statement-and-conclusion',
      difficulty: 'hard',
      question: `Statement: "In a recent survey of tech startups, 70% of company founders reported sleeping fewer than 6 hours per night."\n\nConclusions:\nI. Sleeping fewer than 6 hours is essential to building a successful startup.\nII. All founders who sleep more than 6 hours will fail.`,
      options,
      correctAnswer,
      explanation: `Neither conclusion follows. Correlation between high workload and reduced sleep among respondents does not imply sleep deprivation is a causal requirement for success (Conclusion I). Nor does the survey justify the extreme claim that anyone sleeping >6 hours is guaranteed to fail (Conclusion II).`,
      hints: ['Avoid over-generalizations and extreme unqualified statements.'],
      tags: ['DailyChallenge', 'StatementAndConclusion', 'CriticalReasoning'],
    });
  }

  // Q13: Seating Arrangements - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'P',
      ['Q', 'R', 'S']
    );
    list.push({
      id: `daily-${dateStr}-reason-13`,
      packId,
      categoryId: 'reasoning',
      topicId: 'seating-arrangements',
      difficulty: 'hard',
      question: `Five people P, Q, R, S, and T are seated in a single row facing North.\n- T is sitting at one of the extreme ends.\n- Q is sitting immediately to the right of P.\n- R is sitting between Q and S.\nWho is sitting to the immediate left of Q?`,
      options,
      correctAnswer,
      explanation: `Given that "Q is sitting immediately to the right of P", it directly follows that P is to the immediate left of Q.\nThe deduced linear arrangement from left to right is: P, Q, R, S, T (or T, P, Q, R, S).\nIn either valid seating, the person immediately to the left of Q is P.`,
      hints: ['Read the statement directly linking P and Q.'],
      tags: ['DailyChallenge', 'SeatingArrangements'],
    });
  }

  return list;
}

// ---------------------------------------------------------------------------
// 3. VERBAL ABILITY GENERATORS (12 questions: 4 Easy, 5 Medium, 3 Hard)
// ---------------------------------------------------------------------------
function generateVerbalQuestions(rng: SeededRandom, dateStr: string, packId: string): Question[] {
  const list: Question[] = [];

  // Q1: Synonyms - Easy
  {
    const items = [
      { word: 'BENEVOLENT', ans: 'Kind and generous', distract: ['Hostile', 'Greedy', 'Cowardly'] },
      { word: 'CANDID', ans: 'Frank and outspoken', distract: ['Deceptive', 'Shy', 'Arrogant'] },
      { word: 'LUCID', ans: 'Clear and easily understood', distract: ['Ambiguous', 'Murky', 'Complex'] },
    ];
    const item = rng.pick(items);
    const { options, correctAnswer } = makeOptions(rng, item.ans, item.distract);
    list.push({
      id: `daily-${dateStr}-verbal-1`,
      packId,
      categoryId: 'verbal',
      topicId: 'synonyms-and-antonyms',
      difficulty: 'easy',
      question: `Choose the word or phrase that is closest in meaning (SYNONYM) to the capitalized word:\n${item.word}`,
      options,
      correctAnswer,
      explanation: `"${item.word}" means ${item.ans.toLowerCase()}.`,
      hints: ['Think of common prefixes or roots like bene- (good/kind) or cand- (white/pure/open).'],
      tags: ['DailyChallenge', 'Vocabulary', 'Synonyms'],
    });
  }

  // Q2: Antonyms - Easy
  {
    const items = [
      { word: 'SCARCE', ans: 'Abundant', distract: ['Meager', 'Rare', 'Deficient'] },
      { word: 'TRANSIENT', ans: 'Permanent', distract: ['Fleeting', 'Brief', 'Temporary'] },
      { word: 'METICULOUS', ans: 'Careless', distract: ['Thorough', 'Precise', 'Fastidious'] },
    ];
    const item = rng.pick(items);
    const { options, correctAnswer } = makeOptions(rng, item.ans, item.distract);
    list.push({
      id: `daily-${dateStr}-verbal-2`,
      packId,
      categoryId: 'verbal',
      topicId: 'synonyms-and-antonyms',
      difficulty: 'easy',
      question: `Select the word that is most nearly OPPOSITE in meaning (ANTONYM) to:\n${item.word}`,
      options,
      correctAnswer,
      explanation: `"${item.word}" refers to something rare, fleeting, or detailed. Its direct antonym is "${item.ans}".`,
      hints: ['Remember you are searching for the OPPOSITE meaning, not the synonym.'],
      tags: ['DailyChallenge', 'Vocabulary', 'Antonyms'],
    });
  }

  // Q3: Synonyms - Medium
  {
    const items = [
      { word: 'EPHEMERAL', ans: 'Short-lived', distract: ['Eternal', 'Substantial', 'Artificial'] },
      { word: 'PRAGMATIC', ans: 'Practical and realistic', distract: ['Idealistic', 'Theoretical', 'Irrational'] },
      { word: 'UBIQUITOUS', ans: 'Omnipresent', distract: ['Rare', 'Localized', 'Foreign'] },
      { word: 'TENACIOUS', ans: 'Persistent and resolute', distract: ['Yielding', 'Weak', 'Indecisive'] },
    ];
    const item = rng.pick(items);
    const { options, correctAnswer } = makeOptions(rng, item.ans, item.distract);
    list.push({
      id: `daily-${dateStr}-verbal-3`,
      packId,
      categoryId: 'verbal',
      topicId: 'synonyms-and-antonyms',
      difficulty: 'medium',
      question: `Identify the option that best expresses the meaning of the word "${item.word}":`,
      options,
      correctAnswer,
      explanation: `"${item.word}" means ${item.ans.toLowerCase()}.`,
      hints: ['Consider how this word is used in academic essays or literature.'],
      tags: ['DailyChallenge', 'Vocabulary', 'HighFrequencyWords'],
    });
  }

  // Q4: Antonyms - Medium
  {
    const items = [
      { word: 'BELLIGERENT', ans: 'Peaceable', distract: ['Combative', 'Aggressive', 'Quarrelsome'] },
      { word: 'DILIGENT', ans: 'Slothful', distract: ['Industrious', 'Conscientious', 'Hardworking'] },
      { word: 'OBSCURE', ans: 'Distinct', distract: ['Vague', 'Ambiguous', 'Concealed'] },
    ];
    const item = rng.pick(items);
    const { options, correctAnswer } = makeOptions(rng, item.ans, item.distract);
    list.push({
      id: `daily-${dateStr}-verbal-4`,
      packId,
      categoryId: 'verbal',
      topicId: 'synonyms-and-antonyms',
      difficulty: 'medium',
      question: `Find the word that is most diametrically OPPOSITE to "${item.word}":`,
      options,
      correctAnswer,
      explanation: `"${item.word}" implies hostility or vagueness; its direct antonym is "${item.ans}".`,
      hints: ['Eliminate words that share a similar hostile or negative connotation.'],
      tags: ['DailyChallenge', 'Vocabulary', 'Antonyms'],
    });
  }

  // Q5: Idioms and Phrases - Easy
  {
    const items = [
      { idiom: 'Burn the midnight oil', ans: 'Work late into the night', distract: ['Waste fuel carelessly', 'Cause an accident', 'Wake up early in the morning'] },
      { idiom: 'Bite the bullet', ans: 'Face a grim situation with fortitude', distract: ['Eat hard food', 'Engage in warfare', 'Give up easily'] },
      { idiom: 'At the eleventh hour', ans: 'At the last possible moment', distract: ['Early in the day', 'Precisely at 11 AM', 'Too late to act'] },
    ];
    const item = rng.pick(items);
    const { options, correctAnswer } = makeOptions(rng, item.ans, item.distract);
    list.push({
      id: `daily-${dateStr}-verbal-5`,
      packId,
      categoryId: 'verbal',
      topicId: 'idioms-and-phrases',
      difficulty: 'easy',
      question: `What is the conventional meaning of the idiomatic expression:\n"${item.idiom}"?`,
      options,
      correctAnswer,
      explanation: `The idiom "${item.idiom}" colloquially means to ${item.ans.toLowerCase()}.`,
      hints: ['Idioms typically have figurative rather than literal interpretations.'],
      tags: ['DailyChallenge', 'IdiomsAndPhrases'],
    });
  }

  // Q6: Idioms and Phrases - Medium
  {
    const items = [
      { idiom: 'Play devil\'s advocate', ans: 'Argue against an idea for the sake of exploring it', distract: ['Promote wrongdoing', 'Support an adversary', 'Refuse to participate'] },
      { idiom: 'Throw in the towel', ans: 'Admit defeat or quit', distract: ['Begin laundry', 'Wash one\'s hands', 'Fight aggressively'] },
      { idiom: 'A blessing in disguise', ans: 'An apparent misfortune that yields good results', distract: ['A masquerade party', 'A hidden curse', 'An obvious advantage'] },
    ];
    const item = rng.pick(items);
    const { options, correctAnswer } = makeOptions(rng, item.ans, item.distract);
    list.push({
      id: `daily-${dateStr}-verbal-6`,
      packId,
      categoryId: 'verbal',
      topicId: 'idioms-and-phrases',
      difficulty: 'medium',
      question: `Select the option that accurately describes the idiom "${item.idiom}":`,
      options,
      correctAnswer,
      explanation: `"${item.idiom}" refers to: ${item.ans}.`,
      hints: ['Think of debate contexts and rhetorical exercises.'],
      tags: ['DailyChallenge', 'IdiomsAndPhrases'],
    });
  }

  // Q7: Grammar - Subject-Verb Agreement - Easy
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'is',
      ['are', 'were', 'have been']
    );
    list.push({
      id: `daily-${dateStr}-verbal-7`,
      packId,
      categoryId: 'verbal',
      topicId: 'grammar',
      difficulty: 'easy',
      question: `Fill in the blank with the grammatically correct auxiliary verb:\n"Neither the project manager nor the software architect _____ available for the conference call."`,
      options,
      correctAnswer,
      explanation: `When two singular subjects are joined by "neither... nor", the verb agrees with the closer subject ("the software architect", which is singular). Hence, the singular verb "is" is correct.`,
      hints: ['In "neither... nor" constructions, the verb agrees with the subject closest to it.'],
      tags: ['DailyChallenge', 'Grammar', 'SubjectVerbAgreement'],
    });
  }

  // Q8: Grammar - Prepositions - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'with',
      ['to', 'for', 'about']
    );
    list.push({
      id: `daily-${dateStr}-verbal-8`,
      packId,
      categoryId: 'verbal',
      topicId: 'grammar',
      difficulty: 'medium',
      question: `Choose the correct preposition to complete the sentence:\n"The startup's new privacy policy complies _____ the latest international data protection regulations."`,
      options,
      correctAnswer,
      explanation: `The verb "comply" strictly takes the preposition "with" (e.g. "comply with regulations/standards").`,
      hints: ['Pair the verb "comply" with its standard dependent preposition.'],
      tags: ['DailyChallenge', 'Grammar', 'Prepositions'],
    });
  }

  // Q9: Sentence Correction - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'One of the senior engineers has submitted his resignation.',
      [
        'One of the senior engineers have submitted their resignation.',
        'One of the senior engineers have submitted his resignation.',
        'One of the senior engineer has submitted their resignation.',
      ]
    );
    list.push({
      id: `daily-${dateStr}-verbal-9`,
      packId,
      categoryId: 'verbal',
      topicId: 'sentence-correction',
      difficulty: 'medium',
      question: `Select the grammatically flawless sentence among the options provided below:`,
      options,
      correctAnswer,
      explanation: `In the construction "One of the [plural noun] + [singular verb]", the true subject is "One", which requires the singular verb "has". The plural noun following "of the" must be "engineers".`,
      hints: ['The subject is "One", which is singular.'],
      tags: ['DailyChallenge', 'SentenceCorrection'],
    });
  }

  // Q10: Grammar - Conditionals - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'would have notified',
      ['will notify', 'would notify', 'notified']
    );
    list.push({
      id: `daily-${dateStr}-verbal-10`,
      packId,
      categoryId: 'verbal',
      topicId: 'grammar',
      difficulty: 'hard',
      question: `Select the correct verbal phrase for the Third Conditional:\n"If the quality assurance team had discovered the security vulnerability earlier, they _____ the lead developers immediately."`,
      options,
      correctAnswer,
      explanation: `Third conditional sentences represent hypothetical past situations: "If + past perfect (had discovered), ... would have + past participle (would have notified)".`,
      hints: ['Formula for Third Conditional: If + had + V3, would have + V3.'],
      tags: ['DailyChallenge', 'Grammar', 'Conditionals'],
    });
  }

  // Q11: Sentence Ordering - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Q - S - P - R',
      ['P - Q - R - S', 'S - Q - R - P', 'R - P - Q - S']
    );
    list.push({
      id: `daily-${dateStr}-verbal-11`,
      packId,
      categoryId: 'verbal',
      topicId: 'sentence-ordering',
      difficulty: 'hard',
      question: `Arrange the following sentences in a coherent, logically sound paragraph:\nP. Consequently, modern software teams increasingly automate regression testing.\nQ. Delivering bug-free features on tight deadlines is a paramount challenge.\nR. This automation dramatically shortens release cycles without compromising safety.\nS. Manual testing alone is often too slow and prone to human error.`,
      options,
      correctAnswer,
      explanation: `Coherent order: Q introduces the core challenge ("Delivering bug-free features..."). S explains why manual testing fails to solve it. P states the consequence/solution ("Consequently, teams automate..."). R concludes with the benefit of that automation. Hence, Q - S - P - R.`,
      hints: ['Identify the introductory theme sentence and the connecting transition words like "Consequently".'],
      tags: ['DailyChallenge', 'ParaJumbles', 'LogicalFlow'],
    });
  }

  // Q12: Reading Comprehension / Vocabulary - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'It implies a reluctance to act stemming from mixed feelings.',
      [
        'It suggests enthusiastic and prompt execution.',
        'It indicates complete hostility and aggression.',
        'It denotes absolute certainty and confidence.',
      ]
    );
    list.push({
      id: `daily-${dateStr}-verbal-12`,
      packId,
      categoryId: 'verbal',
      topicId: 'reading-comprehension',
      difficulty: 'hard',
      question: `Context: "The committee greeted the CEO's restructuring proposal with noticeable ambivalence, postponing the board vote until next quarter."\nWhat does the term "ambivalence" indicate regarding the committee's attitude?`,
      options,
      correctAnswer,
      explanation: `"Ambivalence" denotes the state of having mixed, contradictory, or simultaneous opposing feelings towards someone or something, leading to hesitation or postponement.`,
      hints: ['Prefix "ambi-" means both (e.g. ambidextrous).'],
      tags: ['DailyChallenge', 'ContextualVocabulary', 'ReadingComprehension'],
    });
  }

  return list;
}

// ---------------------------------------------------------------------------
// 4. GENERAL KNOWLEDGE GENERATORS (10 questions: 4 Easy, 4 Medium, 2 Hard)
// ---------------------------------------------------------------------------
function generateGKQuestions(rng: SeededRandom, dateStr: string, packId: string): Question[] {
  const list: Question[] = [];

  // Q1: Indian Polity - Easy
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Dr. B. R. Ambedkar',
      ['Dr. Rajendra Prasad', 'Jawaharlal Nehru', 'Sardar Vallabhbhai Patel']
    );
    list.push({
      id: `daily-${dateStr}-gk-1`,
      packId,
      categoryId: 'gk',
      topicId: 'indian-polity',
      difficulty: 'easy',
      question: `Who was appointed as the Chairman of the Drafting Committee of the Constituent Assembly of India?`,
      options,
      correctAnswer,
      explanation: `Dr. Bhimrao Ramji Ambedkar served as the Chairman of the Drafting Committee appointed on August 29, 1947, and is widely recognized as the Chief Architect of the Constitution of India.`,
      hints: ['Known as the father of the Indian Constitution.'],
      tags: ['DailyChallenge', 'IndianPolity', 'Constitution'],
    });
  }

  // Q2: General Science - Easy
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Mitochondria',
      ['Ribosome', 'Nucleus', 'Endoplasmic Reticulum']
    );
    list.push({
      id: `daily-${dateStr}-gk-2`,
      packId,
      categoryId: 'gk',
      topicId: 'general-science',
      difficulty: 'easy',
      question: `Which cellular organelle is universally referred to as the "Powerhouse of the Cell"?`,
      options,
      correctAnswer,
      explanation: `Mitochondria generate most of the chemical energy needed to power the cell's biochemical reactions in the form of Adenosine Triphosphate (ATP).`,
      hints: ['They synthesize ATP through cellular respiration.'],
      tags: ['DailyChallenge', 'GeneralScience', 'Biology'],
    });
  }

  // Q3: Geography - Easy
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Pacific Ocean',
      ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean']
    );
    list.push({
      id: `daily-${dateStr}-gk-3`,
      packId,
      categoryId: 'gk',
      topicId: 'geography',
      difficulty: 'easy',
      question: `Which is the largest and deepest of the world's five oceanic divisions?`,
      options,
      correctAnswer,
      explanation: `The Pacific Ocean is the largest and deepest ocean on Earth, covering more than 30% of the Earth's surface and containing the Mariana Trench (Challenger Deep).`,
      hints: ['It borders Asia, Australia, and the Americas.'],
      tags: ['DailyChallenge', 'Geography', 'Oceans'],
    });
  }

  // Q4: History - Easy
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      '1947',
      ['1950', '1942', '1945']
    );
    list.push({
      id: `daily-${dateStr}-gk-4`,
      packId,
      categoryId: 'gk',
      topicId: 'indian-history',
      difficulty: 'easy',
      question: `In which historic year did India officially achieve independence from British colonial rule on the 15th of August?`,
      options,
      correctAnswer,
      explanation: `India achieved independence on August 15, 1947, following the enactment of the Indian Independence Act 1947.`,
      hints: ['Preceded the adoption of the Republic Constitution in 1950.'],
      tags: ['DailyChallenge', 'IndianHistory', 'Independence'],
    });
  }

  // Q5: Indian Polity - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Article 32',
      ['Article 14', 'Article 19', 'Article 21']
    );
    list.push({
      id: `daily-${dateStr}-gk-5`,
      packId,
      categoryId: 'gk',
      topicId: 'indian-polity',
      difficulty: 'medium',
      question: `Which Article of the Indian Constitution, guaranteeing the Right to Constitutional Remedies, was described by Dr. B. R. Ambedkar as the "Heart and Soul of the Constitution"?`,
      options,
      correctAnswer,
      explanation: `Article 32 provides the fundamental right to move the Supreme Court by appropriate proceedings for the enforcement of the Fundamental Rights. Ambedkar deemed it the indispensable heart and soul of the Constitution.`,
      hints: ['Empowers citizens to seek writs like Habeas Corpus, Mandamus, etc.'],
      tags: ['DailyChallenge', 'IndianPolity', 'FundamentalRights'],
    });
  }

  // Q6: General Science - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Refraction',
      ['Reflection', 'Total Internal Dispersion', 'Diffraction']
    );
    list.push({
      id: `daily-${dateStr}-gk-6`,
      packId,
      categoryId: 'gk',
      topicId: 'general-science',
      difficulty: 'medium',
      question: `The apparent twinkling of stars in a clear night sky is predominantly caused by which optical atmospheric phenomenon?`,
      options,
      correctAnswer,
      explanation: `Twinkling of stars occurs due to atmospheric refraction of starlight as it travels through layers of the Earth's atmosphere with continuously fluctuating refractive indices and air densities.`,
      hints: ['Bending of light as it passes through media of varying density.'],
      tags: ['DailyChallenge', 'GeneralScience', 'Physics'],
    });
  }

  // Q7: Geography - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Tropic of Cancer (23.5° N)',
      ['Equator (0°)', 'Tropic of Capricorn (23.5° S)', 'Prime Meridian']
    );
    list.push({
      id: `daily-${dateStr}-gk-7`,
      packId,
      categoryId: 'gk',
      topicId: 'geography',
      difficulty: 'medium',
      question: `Which major line of latitude passes horizontally through the center of India, traversing across eight Indian states?`,
      options,
      correctAnswer,
      explanation: `The Tropic of Cancer (23° 30' N) passes through 8 Indian states: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram.`,
      hints: ['It marks the northernmost latitude where the Sun can appear directly overhead.'],
      tags: ['DailyChallenge', 'Geography', 'Latitudes'],
    });
  }

  // Q8: Economics - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'The interest rate at which RBI lends short-term funds to commercial banks',
      [
        'The interest rate commercial banks pay on retail savings deposits',
        'The tax rate levied on corporate net profits',
        'The exchange rate between Indian Rupee and US Dollar',
      ]
    );
    list.push({
      id: `daily-${dateStr}-gk-8`,
      packId,
      categoryId: 'gk',
      topicId: 'economics',
      difficulty: 'medium',
      question: `In Indian monetary policy, what does the term "Repo Rate" fundamentally represent?`,
      options,
      correctAnswer,
      explanation: `Repo Rate (Repurchase Option Rate) is the key policy interest rate at which the Reserve Bank of India (RBI) lends money to commercial banks against government securities to manage liquidity and control inflation.`,
      hints: ['Stands for Repurchase Agreement rate set by RBI.'],
      tags: ['DailyChallenge', 'Economics', 'MonetaryPolicy'],
    });
  }

  // Q9: Indian Polity - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'One-third of members retire every two years',
      [
        'The entire house dissolves every 5 years with Lok Sabha',
        'Half of the members retire every 3 years',
        'Members are appointed for life tenure by the President',
      ]
    );
    list.push({
      id: `daily-${dateStr}-gk-9`,
      packId,
      categoryId: 'gk',
      topicId: 'indian-polity',
      difficulty: 'hard',
      question: `Why is the Rajya Sabha (Council of States) designated as a permanent house that is not subject to dissolution?`,
      options,
      correctAnswer,
      explanation: `According to Article 83(1) of the Constitution of India, Rajya Sabha is a permanent body and not subject to dissolution. Its members serve 6-year staggered terms, and one-third of the members retire every second year.`,
      hints: ['Check the staggered retirement formula under Article 83(1).'],
      tags: ['DailyChallenge', 'IndianPolity', 'RajyaSabha'],
    });
  }

  // Q10: Economics - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Persistent high inflation accompanied by stagnant economic growth and high unemployment',
      [
        'Rapid economic growth accompanied by deflationary price trends',
        'A sudden drop in stock market prices during high GDP expansion',
        'A balanced government budget with zero public debt',
      ]
    );
    list.push({
      id: `daily-${dateStr}-gk-10`,
      packId,
      categoryId: 'gk',
      topicId: 'economics',
      difficulty: 'hard',
      question: `In macroeconomic theory, how is "Stagflation" precisely defined?`,
      options,
      correctAnswer,
      explanation: `Stagflation is an anomalous economic condition characterized by stagnant economic growth (stagnation), high unemployment rates, and simultaneously elevated price inflation.`,
      hints: ['A combination of the words "stagnant" and "inflation".'],
      tags: ['DailyChallenge', 'Economics', 'Macroeconomics'],
    });
  }

  return list;
}

// ---------------------------------------------------------------------------
// 5. TECHNICAL & PROGRAMMING GENERATORS (10 questions: 3 Easy, 4 Medium, 3 Hard)
// ---------------------------------------------------------------------------
function generateTechQuestions(rng: SeededRandom, dateStr: string, packId: string): Question[] {
  const list: Question[] = [];

  // Q1: Python - Easy
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Tuple',
      ['List', 'Dictionary', 'Set']
    );
    list.push({
      id: `daily-${dateStr}-tech-1`,
      packId,
      categoryId: 'tech',
      topicId: 'python',
      difficulty: 'easy',
      question: `Which of the following built-in core data structures in Python is strictly IMMUTABLE once created?`,
      options,
      correctAnswer,
      explanation: `In Python, Tuples and Strings are immutable sequences; their elements cannot be modified, added, or removed in-place after instantiation. Lists, Dictionaries, and Sets are mutable.`,
      hints: ['Defined using parentheses (1, 2, 3).'],
      tags: ['DailyChallenge', 'Python', 'DataStructures'],
    });
  }

  // Q2: SQL - Easy
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'SELECT DISTINCT',
      ['SELECT UNIQUE', 'SELECT DIFFERENT', 'SELECT FILTERED']
    );
    list.push({
      id: `daily-${dateStr}-tech-2`,
      packId,
      categoryId: 'tech',
      topicId: 'sql',
      difficulty: 'easy',
      question: `In standard ANSI SQL, which keyword is utilized in a SELECT statement to eliminate duplicate rows from the result set?`,
      options,
      correctAnswer,
      explanation: `The SELECT DISTINCT syntax is used to return only distinct (different) values from the specified column(s) by filtering out duplicate result records.`,
      hints: ['The standard SQL keyword is DISTINCT.'],
      tags: ['DailyChallenge', 'SQL', 'DatabaseBasics'],
    });
  }

  // Q3: Data Structures - Easy
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Stack',
      ['Queue', 'Linked List', 'Binary Tree']
    );
    list.push({
      id: `daily-${dateStr}-tech-3`,
      packId,
      categoryId: 'tech',
      topicId: 'data-structures-and-algorithms',
      difficulty: 'easy',
      question: `Which fundamental linear data structure strictly adheres to the LIFO (Last In, First Out) principle of element insertion and removal?`,
      options,
      correctAnswer,
      explanation: `A Stack is a LIFO (Last In, First Out) structure where the most recently pushed element is the first one popped. A Queue follows FIFO (First In, First Out).`,
      hints: ['Think of function call stacks or undo history in text editors.'],
      tags: ['DailyChallenge', 'DataStructures', 'Stack'],
    });
  }

  // Q4: JavaScript - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      '"number"',
      ['"nan"', '"undefined"', '"object"']
    );
    list.push({
      id: `daily-${dateStr}-tech-4`,
      packId,
      categoryId: 'tech',
      topicId: 'javascript',
      difficulty: 'medium',
      question: `In modern ECMAScript/JavaScript, what is the exact evaluated string returned by executing the expression: typeof NaN?`,
      options,
      correctAnswer,
      explanation: `According to the IEEE 754 floating-point standard implemented in JavaScript, NaN (Not-a-Number) represents a numeric value that cannot be represented as a valid real number; consequently, typeof NaN returns "number".`,
      hints: ['NaN is technically a special numeric IEEE 754 value.'],
      tags: ['DailyChallenge', 'JavaScript', 'TypeSystem'],
    });
  }

  // Q5: DSA - Time Complexity - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'O(log n)',
      ['O(1)', 'O(n)', 'O(n log n)']
    );
    list.push({
      id: `daily-${dateStr}-tech-5`,
      packId,
      categoryId: 'tech',
      topicId: 'data-structures-and-algorithms',
      difficulty: 'medium',
      question: `What is the worst-case asymptotic time complexity of Binary Search on a sorted contiguous array of n elements?`,
      options,
      correctAnswer,
      explanation: `Binary search halves the search space at each successive step: n -> n/2 -> n/4 -> ... -> 1. The maximum number of comparisons is ⌊log₂ n⌋ + 1, giving worst-case time complexity of O(log n).`,
      hints: ['Halves the search space at each iteration.'],
      tags: ['DailyChallenge', 'Algorithms', 'TimeComplexity'],
    });
  }

  // Q6: Operating Systems - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Preemption of resources by waiting processes',
      ['Mutual Exclusion', 'Hold and Wait', 'Circular Wait']
    );
    list.push({
      id: `daily-${dateStr}-tech-6`,
      packId,
      categoryId: 'tech',
      topicId: 'operating-systems',
      difficulty: 'medium',
      question: `According to Coffman\'s conditions, which of the following is NOT one of the four necessary conditions required for a system Deadlock to occur?`,
      options,
      correctAnswer,
      explanation: `The four Coffman conditions for Deadlock are:\n1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption (resources cannot be forcibly preempted)\n4. Circular Wait.\n"Preemption of resources" is a method to PREVENT deadlock, not a condition that causes it.`,
      hints: ['Deadlocks require NO preemption.'],
      tags: ['DailyChallenge', 'OperatingSystems', 'Deadlock'],
    });
  }

  // Q7: Computer Networks - Medium
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Transport Layer',
      ['Network Layer', 'Data Link Layer', 'Application Layer']
    );
    list.push({
      id: `daily-${dateStr}-tech-7`,
      packId,
      categoryId: 'tech',
      topicId: 'computer-networks',
      difficulty: 'medium',
      question: `At which specific layer of the 7-layer ISO/OSI Reference Model do the Transmission Control Protocol (TCP) and User Datagram Protocol (UDP) operate?`,
      options,
      correctAnswer,
      explanation: `TCP and UDP operate at Layer 4: The Transport Layer, responsible for host-to-host end-to-end communication, port addressing, flow control, and segmentation.`,
      hints: ['Layer 4 responsible for port-to-port multiplexing.'],
      tags: ['DailyChallenge', 'ComputerNetworks', 'OSIModel'],
    });
  }

  // Q8: DBMS - SQL Joins - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'WHERE filters rows before aggregation, while HAVING filters grouped results after aggregation.',
      [
        'HAVING filters rows before aggregation, while WHERE filters grouped results.',
        'WHERE can only be used with numeric fields, whereas HAVING works only with strings.',
        'There is no operational difference; HAVING is simply a modern synonym for WHERE.',
      ]
    );
    list.push({
      id: `daily-${dateStr}-tech-8`,
      packId,
      categoryId: 'tech',
      topicId: 'dbms',
      difficulty: 'hard',
      question: `What is the fundamental architectural difference between the WHERE clause and the HAVING clause in an SQL query?`,
      options,
      correctAnswer,
      explanation: `The WHERE clause filters individual records BEFORE the GROUP BY aggregation phase and cannot evaluate aggregate functions (like SUM, COUNT, AVG). The HAVING clause evaluates conditions on grouped summary records AFTER the GROUP BY aggregation.`,
      hints: ['WHERE applies before grouping; HAVING applies to aggregate summaries.'],
      tags: ['DailyChallenge', 'SQL', 'DBMS'],
    });
  }

  // Q9: DSA - Quicksort Worst Case - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'O(n²)',
      ['O(n log n)', 'O(n)', 'O(log n)']
    );
    list.push({
      id: `daily-${dateStr}-tech-9`,
      packId,
      categoryId: 'tech',
      topicId: 'data-structures-and-algorithms',
      difficulty: 'hard',
      question: `What is the worst-case time complexity of the standard QuickSort algorithm (using naive first or last element pivot selection) when executed on an already sorted array?`,
      options,
      correctAnswer,
      explanation: `When the pivot chosen is consistently the smallest or largest element (such as picking the last element in an already sorted array), partitions become unbalanced of sizes 0 and n - 1. The recurrence becomes T(n) = T(n - 1) + O(n), which resolves to O(n²).`,
      hints: ['Unbalanced partitions lead to quadratic comparisons.'],
      tags: ['DailyChallenge', 'Algorithms', 'Sorting'],
    });
  }

  // Q10: Python / JavaScript Internals - Hard
  {
    const { options, correctAnswer } = makeOptions(
      rng,
      'Microtasks (e.g. resolved Promises) execute before the next macrotask (e.g. setTimeout) is dequeued.',
      [
        'Macrotasks always take strict priority over all microtasks in the event loop.',
        'setTimeout(..., 0) always executes synchronously before any Promise resolution.',
        'The call stack must wait for network I/O before processing synchronous code.',
      ]
    );
    list.push({
      id: `daily-${dateStr}-tech-10`,
      packId,
      categoryId: 'tech',
      topicId: 'javascript',
      difficulty: 'hard',
      question: `In JavaScript\'s Event Loop architecture, how are Microtasks (Promise.then callbacks, queueMicrotask) scheduled relative to Macrotasks (setTimeout, setInterval)?`,
      options,
      correctAnswer,
      explanation: `At the end of each synchronous task execution, before moving on to the next macrotask in the callback queue, the event loop completely flushes and drains the entire microtask queue (including any new microtasks queued during that phase).`,
      hints: ['The microtask queue is fully drained before picking the next task.'],
      tags: ['DailyChallenge', 'JavaScript', 'EventLoop'],
    });
  }

  return list;
}

/**
 * Main generator function that produces 60 distinct questions for any given dateStr.
 * Difficulty Distribution:
 * - Easy: 20 questions
 * - Medium: 25 questions
 * - Hard: 15 questions
 * Total: 60 questions!
 */
export function generateDaily60Questions(dateStr: string): Question[] {
  const seed = hashDateStringToSeed(dateStr);
  const rng = new SeededRandom(seed);
  const packId = `daily-pack-${dateStr}`;

  const quant = generateQuantQuestions(rng, dateStr, packId);      // 15 questions
  const reasoning = generateReasoningQuestions(rng, dateStr, packId); // 13 questions
  const verbal = generateVerbalQuestions(rng, dateStr, packId);     // 12 questions
  const gk = generateGKQuestions(rng, dateStr, packId);             // 10 questions
  const tech = generateTechQuestions(rng, dateStr, packId);         // 10 questions

  const all60 = [...quant, ...reasoning, ...verbal, ...gk, ...tech];

  // Verify exactly 60
  if (all60.length !== 60) {
    console.warn(`Generated ${all60.length} questions instead of 60 for date ${dateStr}`);
  }

  // Re-number IDs cleanly: daily-{dateStr}-1 to daily-{dateStr}-60
  return all60.map((q, idx) => ({
    ...q,
    id: `daily-${dateStr}-${idx + 1}`,
    packId,
    tags: [...new Set([...(q.tags || []), 'DailyChallenge', dateStr])],
  }));
}
