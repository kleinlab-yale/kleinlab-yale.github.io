import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const workbookSource = await readFile(
  new URL("../workbook-questions.js", import.meta.url),
  "utf8",
);
const context = vm.createContext({ window: {} });
vm.runInContext(workbookSource, context);

const standard = context.window.MATHGAME_WORKBOOK_QUESTIONS;
const advanced = context.window.MATHGAME_EMMA_QUESTIONS;

const gameSource = await readFile(new URL("../script.js", import.meta.url), "utf8");
const mathStart = gameSource.indexOf("function choose(");
const mathEnd = gameSource.indexOf("els.setupForm.addEventListener", mathStart);
const gradingContext = vm.createContext({ Math });
vm.runInContext(gameSource.slice(mathStart, mathEnd), gradingContext);

function fraction(numerator, denominator = 1) {
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
  const sign = denominator < 0 ? -1 : 1;
  return { n: sign * numerator / divisor, d: Math.abs(denominator) / divisor };
}

function gcd(left, right) {
  let a = left;
  let b = right;
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function add(left, right) {
  return fraction(left.n * right.d + right.n * left.d, left.d * right.d);
}

function subtract(left, right) {
  return fraction(left.n * right.d - right.n * left.d, left.d * right.d);
}

function multiply(left, right) {
  return fraction(left.n * right.n, left.d * right.d);
}

function fromDecimal(value) {
  const [, whole, decimals = ""] = String(value).match(/^(\d+)(?:\.(\d+))?$/);
  return fraction(Number(`${whole}${decimals}`), 10 ** decimals.length);
}

function verifyBank(bank, expected, label) {
  assert.equal(bank.length, expected.length, `${label} audit must cover every question`);
  bank.forEach((question, index) => {
    assertEquivalent(question.answer, expected[index], `${label} question ${index + 1}: ${question.prompt}`);
  });
}

function assertEquivalent(actual, expected, message) {
  if (typeof actual === "number" && typeof expected === "number") {
    assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, received ${actual}`);
    return;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    assert.equal(actual.length, expected.length, message);
    actual.forEach((value, index) => assertEquivalent(value, expected[index], message));
    return;
  }
  if (actual && expected && typeof actual === "object" && typeof expected === "object") {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), message);
    for (const key of Object.keys(expected)) assertEquivalent(actual[key], expected[key], message);
    return;
  }
  assert.equal(actual, expected, message);
}

const standardExpected = [
  "my number", // my/3 = friend/2, so my = 3k and friend = 2k
  [3 * 2, 2 * 2],
  subtract(fraction(6, 5), fraction(11, 10)),
  subtract(fraction(5, 6), fraction(1, 12)),
  add(fraction(9, 10), fraction(7, 15)),
  subtract(fraction(16, 25), fraction(23, 50)),
  subtract(fraction(5, 18), fraction(1, 9)),
  subtract(fraction(3, 4), fraction(5, 12)),
  (9 + 10 + 11) / (1 + 2 + 3),
  (11 - 10 + 9) / (3 - 2 + 1),
  (18 - 1 - 2 - 3) / (1 + 2 + 3),
  (79 + 9) / (11 - 7),
  fraction(38 - 34, 9),
  (12 * 3 + 11) / (12 - 11),
  { x: 8, c: 8 * 4 - 25 },
  { a: -4 + 1, c: 5 * 4 },
  { b: 3 - 1 },
  { a: 1 + 7 },
  { a: 9, c: 4 * 9 - 12 },
  { b: 1 },
  { a: 1, c: 4 + 4 },
  { a: 1 + 6, c: 3 - 7 },
  { a: 8, c: 7 * 8 },
  { a: 14 * 5, c: 6 * 5 - 54 },
  8 - 18,
  10 - (-14),
  { a: 452 - 451, c: 452 + 451 },
  fromDecimal("0.7"),
  fromDecimal("0.07"),
  fromDecimal("0.43"),
  fromDecimal("2.78"),
  fromDecimal("1.4"),
  fromDecimal("0.40"),
  fromDecimal("0.94"),
  fromDecimal("0.006"),
  [7 * 3, 2 * (7 + 3)],
  6 * 5 / 2,
  (7 + 3) * 2 / 2,
  [3 * 4 / 2 + 2 * 2, 3 + 4 + 5 + 4 * 2 - 2 * 2],
  multiply(fraction(2), add(add(fraction(8, 3), fraction(5, 4)), fraction(5, 6))),
  556 - (256 + 30),
  227 - 199 - 1,
  (2784 + 3899) - 784,
  (25891 + 5909) - 2909,
  (23 - 5) / 2,
  (50 + 14) / 2,
  (47 + 13) / 3,
  (61 - 7) / 2,
  [(90 + 2) / 2, (90 - 2) / 2],
  (4 + 2) / (9 - 8),
  6 * 8 + 2,
  27 - 2 * 11,
  14 - 2 * 6,
  "Tigers",
  [(126 + 12) / 2, (126 - 12) / 2],
  [4, (10 - 1.7 * 4) / 1.6],
  (5 * (1 + 2 + 3 + 4)) % 3,
  "3 halves and 2 thirds",
  [36 - 3 * 10, 10 - (36 - 3 * 10)],
  [5, 3 * 5 + 1],
  [4, 2 * 4, 8 * (18 / 4)],
  [7, 16 - 7, (16 - 7) * (7 + 3)],
  2 * 100 + 3,
  4 * 100 + 5,
];

const advancedExpected = [
  (37 + 15 - 4) / 6,
  -(29 - 14),
  (15 - 7) * 3,
  (18 + 12) / (4 - 2),
  (7 - 8 + 13) / 2,
  (17 - 5) * 3 / 2,
  (9 + 6) * 4 / 3,
  (28 - 4) / -8,
  40 * 5 / 8,
  12 / (3 / 4),
  12.25 / 7 * 10,
  12 * 4.5,
  multiply(fraction(5, 2), fraction(7, 4)),
  18 / 0.30,
  483 / 10,
  40 * 3 / 4,
  3 ** 4 + Math.sqrt(49),
  2 ** 5 * 3,
  Math.sqrt(144) - 2 ** 3,
  5 ** 2 + 4 ** 2,
  10 ** (3 - 1),
  3 * 12 - 7,
  (17 - 5) / (6 - 2),
  4 - (-2 * 3),
  4 * -3 + 1,
  { x: 10 - 6, c: 6 - (10 - 6) },
  (-5 - 7) / (3 - (-1)),
  -10 / 2 + 9,
  fraction(22, 7).n / fraction(22, 7).d * 7 ** 2,
  2 * 3.14 * 5,
  8 * 5 * 3,
  14 * 9 / 2,
  (8 + 14) * 5 / 2,
  Math.sqrt(9 ** 2 + 12 ** 2),
  Math.sqrt(13 ** 2 - 5 ** 2),
  2 * (4 * 5 + 4 * 6 + 5 * 6),
  (8 + 12 + 15 + 17) / 4,
  [3, 9, 4, 12, 8].sort((a, b) => a - b)[2],
  fraction(5, 5 + 3 + 2),
  fraction(3, 2 ** 3),
  30 - 14,
  7,
  "x < 6",
  "x <= -4",
  "x >= 20",
  3.2 * 10 ** 4,
  { x: 4 * 2 - 3, c: 4 * -3 - 3 * 5 },
  { b: -2 * -5 + 4 },
  { x: 5 * 2 - 3, c: 5 + 8 },
  { y: 3 - 2, c: 3 * -4 + 2 * 5 },
  8496 / 100,
  (300 - 240) / 240 * 100,
  (16 - 4) / 0.6,
  40 * 5 / (3 + 5),
];

test("all 118 workbook answers match independently recomputed results", () => {
  verifyBank(standard, standardExpected, "standard");
  verifyBank(advanced, advancedExpected, "advanced");
});

test("every workbook question is complete, unique, and gradeable", () => {
  const questions = [...standard, ...advanced];
  assert.equal(new Set(questions.map((item) => item.prompt)).size, questions.length);

  for (const question of questions) {
    assert.ok(question.prompt?.trim(), "question needs a prompt");
    assert.ok(question.displayAnswer?.trim(), `${question.prompt}: needs a display answer`);
    assert.equal(question.steps?.length, 3, `${question.prompt}: needs three solution steps`);
    assert.ok(question.answer !== null && question.answer !== undefined, `${question.prompt}: needs an answer`);
    if (question.answerType === "choice") {
      const choices = question.choices.map((choice) => String(choice).toLowerCase());
      assert.ok(choices.includes(String(question.answer).toLowerCase()), `${question.prompt}: answer must be a choice`);
    }
  }
});

test("the real game grader accepts a canonical correct response for every workbook item", () => {
  for (const rawQuestion of [...standard, ...advanced]) {
    const question = gradingContext.workbookProblemFromRaw(rawQuestion);
    let response;
    if (question.answerType === "rational") response = `${question.answer.n}/${question.answer.d}`;
    else if (question.answerType === "linear") response = question.displayAnswer;
    else if (question.answerType === "numberList") response = question.answer.join(", ");
    else if (question.answerType === "percent") response = `${question.answer}%`;
    else response = String(question.answer);

    assert.equal(
      gradingContext.isCorrect(response, question),
      true,
      `${question.prompt}: grader rejected ${response}`,
    );
  }
});

test("the basketball price accepts natural currency answers", () => {
  const rawQuestion = standard.find((item) =>
    item.prompt.startsWith("Six boys want to buy a basketball"),
  );
  const question = gradingContext.workbookProblemFromRaw(rawQuestion);

  for (const response of ["50", "$50", "50$", "50 dollars", "50 bucks"]) {
    assert.equal(
      gradingContext.isCorrect(response, question),
      true,
      `basketball price grader rejected ${response}`,
    );
  }
});

test("the sticker equalization problem preserves the story's quantities", () => {
  const question = standard.find((item) =>
    item.prompt.startsWith("Ethan and Dennis had 50 stickers together"),
  );
  const ethan = question.answer;
  const dennis = 50 - ethan;

  assert.ok(ethan <= 50, "one person's amount cannot exceed the combined total");
  assert.equal(ethan + dennis, 50);
  assert.equal(ethan - 14, dennis);
  assert.equal(question.displayAnswer, "32");
});
