import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const scriptSource = await readFile(new URL("../script.js", import.meta.url), "utf8");
const mathStart = scriptSource.indexOf("function choose(");
const mathEnd = scriptSource.indexOf("els.setupForm.addEventListener", mathStart);
assert.ok(mathStart >= 0 && mathEnd > mathStart, "could not isolate the math engine");
const mathSource = scriptSource.slice(mathStart, mathEnd);

const factories = [
  "makeKitchenTrayMultiplicationProblem",
  "makeKitchenSnackCartProblem",
  "makeKitchenShelfCountingProblem",
  "makeKitchenChangeProblem",
  "makeKitchenScaleRecipeProblem",
  "makeKitchenFractionOfNumberProblem",
  "makeKitchenRecipeFractionProblem",
  "makeKitchenRecipeEquationProblem",
  "makeKitchenUnitFractionProblem",
  "makeKitchenTileAreaProblem",
  "makeKitchenTilePerimeterProblem",
  "makeKitchenBacksplashAreaProblem",
  "makeKitchenShelfPerimeterProblem",
  "makeLShapeAreaProblem",
  "makeLShapePerimeterProblem",
  "makeRightTriangleAreaProblem",
  "makeRightTrianglePerimeterProblem",
  "makeRectangleTriangleAreaProblem",
  "makeCompositePerimeterProblem",
  "makeMultiplicationProblem",
  "makeDistributedExpressionProblem",
  "makeSubtractExpressionProblem",
  "makeCombineExpressionProblem",
  "makeLinearEquationProblem",
  "makeDistributedEquationProblem",
  "makeFractionEquationProblem",
  "makeMixedFractionEquationProblem",
  "makeWordEquationProblem",
  "makeDecimalFractionProblem",
  "makeDecimalOfWholeProblem",
  "makeDecimalDivisionProblem",
  "makeDecimalAsPercentProblem",
  "makeFractionAsPercentProblem",
  "makeFractionAsDecimalProblem",
  "makePowerOfTenDecimalProblem",
];

const routingFactories = [
  "makeBridgeProblem",
  "makeDecimalFluencyProblem",
  "makeEquationProblem",
  "makeExpressionProblem",
  "makeGeometryProblem",
  "makeKitchenFractionProblem",
  "makeKitchenGeometryProblem",
  "makeKitchenNumberProblem",
  "makeNumberProblem",
];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function makeMathContext(seed) {
  const seededMath = Object.create(Math);
  seededMath.random = seededRandom(seed);
  const context = vm.createContext({ Math: seededMath });
  vm.runInContext(mathSource, context);
  return context;
}

function rational(numerator, denominator = 1) {
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
  const sign = denominator < 0 ? -1 : 1;
  return { n: sign * numerator / divisor, d: Math.abs(denominator) / divisor };
}

function gcd(left, right) {
  let a = Math.round(left);
  let b = Math.round(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function parseFraction(text) {
  const match = String(text).trim().match(/^(-?\d+)\/(\d+)$/);
  assert.ok(match, `expected a fraction, received ${text}`);
  return rational(Number(match[1]), Number(match[2]));
}

function parseMixed(text) {
  const match = String(text).trim().match(/^(-?\d+) and (\d+)\/(\d+)$/);
  if (!match) return parseFraction(text);
  const whole = Number(match[1]);
  const sign = whole < 0 ? -1 : 1;
  return rational(whole * Number(match[3]) + sign * Number(match[2]), Number(match[3]));
}

function assertRational(actual, expected, message) {
  assert.equal(actual.n, expected.n, message);
  assert.equal(actual.d, expected.d, message);
}

function numericAnswer(problem) {
  if (typeof problem.answer === "number") return problem.answer;
  if (problem.answer && typeof problem.answer.n === "number") return problem.answer.n / problem.answer.d;
  throw new Error(`expected numeric answer for: ${problem.prompt}`);
}

function evaluateTrustedArithmetic(expression, variables = {}) {
  let normalized = expression
    .replace(/\b(\d+)\s+and\s+(\d+)\/(\d+)\b/g, "($1+$2/$3)")
    .replace(/(\d|\))(?=[a-z(])/gi, "$1*");
  for (const [name, value] of Object.entries(variables)) {
    normalized = normalized.replace(new RegExp(`\\b${name}\\b`, "g"), `(${value})`);
  }
  normalized = normalized.replace(/\bx\b/g, "*");
  assert.match(normalized, /^[\d\s+*/().-]+$/, `unsafe generated expression: ${expression}`);
  return vm.runInNewContext(normalized);
}

function linearAnswerValue(answer, variables) {
  return (answer.a || 0) * variables.a
    + (answer.b || 0) * variables.b
    + (answer.x || 0) * variables.x
    + (answer.y || 0) * variables.y
    + (answer.c || 0);
}

function verifyGeneratedProblem(problem) {
  const prompt = problem.prompt;
  let match;

  assert.ok(prompt && problem.displayAnswer, "generated problem must be complete");

  if ((match = prompt.match(/^Kitchen trays: each tray has (\d+) puppy treats\. How many treats are on (\d+) trays\?$/))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]));
  } else if ((match = prompt.match(/^Snack cart: (\d+) jars each hold (\d+) biscuits\. After (\d+) biscuits are served, how many are left\?$/))) {
    const total = Number(match[1]) * Number(match[2]);
    const served = Number(match[3]);
    assert.ok(served <= total, `${prompt}: cannot serve more biscuits than exist`);
    assert.equal(problem.answer, total - served);
    assert.ok(problem.answer >= 0, `${prompt}: remaining count cannot be negative`);
  } else if ((match = prompt.match(/^Kitchen shelves: (\d+) shelves hold (\d+) bowls each, plus (\d+) bowls on the counter\./))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]) + Number(match[3]));
  } else if ((match = prompt.match(/^Kitchen shop: (\d+) snacks cost \$(\d+(?:\.\d+)?) each\. If you pay \$(\d+),/))) {
    assert.ok(Math.abs(problem.answer - (Number(match[3]) - Number(match[1]) * Number(match[2]))) < 1e-9);
    assert.ok(problem.answer > 0, `${prompt}: payment must cover the cost`);
  } else if ((match = prompt.match(/^Recipe scale: one batch makes (\d+) cookies\. How many cookies do (\d+) batches make\?$/))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]));
  } else if ((match = prompt.match(/^Kitchen prep: find (\d+)\/(\d+) of (\d+) treats\.$/))) {
    assert.equal(problem.answer, Number(match[1]) / Number(match[2]) * Number(match[3]));
  } else if ((match = prompt.match(/^Recipe water: one batch uses (\d+)\/(\d+) cup\. How many cups for (\d+) batches\?$/))) {
    assertRational(problem.answer, rational(Number(match[1]) * Number(match[3]), Number(match[2])), prompt);
  } else if ((match = prompt.match(/^Solve: x \+ (\d+)\/(\d+) cup = (\d+)\/(\d+) cup$/))) {
    assertRational(problem.answer, rational(Number(match[3]) * Number(match[2]) - Number(match[1]) * Number(match[4]), Number(match[2]) * Number(match[4])), prompt);
  } else if ((match = prompt.match(/^Sink cups: (\d+) scoops are each 1\/(\d+) cup\./))) {
    assertRational(problem.answer, rational(Number(match[1]), Number(match[2])), prompt);
  } else if ((match = prompt.match(/^Kitchen floor tiles: (\d+) rows with (\d+) tiles in each row\./))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]));
  } else if ((match = prompt.match(/^Sink mat: a rectangular mat is (\d+) by (\d+)\./))) {
    assert.equal(problem.answer, 2 * (Number(match[1]) + Number(match[2])));
  } else if ((match = prompt.match(/^Kitchen backsplash: a rectangle is (\d+) by (\d+)\./))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]));
  } else if ((match = prompt.match(/^Wall shelf label: a rectangle is (\d+) by (\d+)\./))) {
    assert.equal(problem.answer, 2 * (Number(match[1]) + Number(match[2])));
  } else if ((match = prompt.match(/^L-shape area: start with a (\d+) by (\d+) rectangle and cut out a (\d+) by (\d+) corner\./))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]) - Number(match[3]) * Number(match[4]));
  } else if ((match = prompt.match(/^L-shape perimeter: a (\d+) by (\d+) rectangle has a (\d+) by (\d+) corner cut out\./))) {
    assert.equal(problem.answer, 2 * (Number(match[1]) + Number(match[2])));
  } else if ((match = prompt.match(/^Right triangle area: legs are (\d+) and (\d+)\./))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]) / 2);
  } else if ((match = prompt.match(/^Right triangle perimeter: sides are (\d+), (\d+), and (\d+)\./))) {
    assert.equal(problem.answer, Number(match[1]) + Number(match[2]) + Number(match[3]));
  } else if ((match = prompt.match(/^Composite area: a (\d+) by (\d+) rectangle .* base (\d+) and height (\d+)\./))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]) + Number(match[3]) * Number(match[4]) / 2);
  } else if (prompt.startsWith("Composite perimeter: outside sides are ")) {
    const sides = prompt.match(/\d+/g).map(Number);
    assert.equal(problem.answer, sides.reduce((sum, side) => sum + side, 0));
  } else if ((match = prompt.match(/^(\d+) x (\d+) = \?$/))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]));
  } else if (problem.answerType === "linear" && prompt.endsWith(" = ?")) {
    const expression = prompt.slice(0, -4);
    for (const variables of [{ a: 2, b: 3, x: 5, y: 7 }, { a: -3, b: 4, x: -2, y: 6 }]) {
      assert.equal(evaluateTrustedArithmetic(expression, variables), linearAnswerValue(problem.answer, variables), prompt);
    }
  } else if (prompt.startsWith("Solve: ")) {
    const [left, right] = prompt.slice(7).replace(/ cup/g, "").split(" = ");
    const solution = numericAnswer(problem);
    const leftValue = evaluateTrustedArithmetic(left, { x: solution });
    const rightValue = evaluateTrustedArithmetic(right, { x: solution });
    assert.ok(Math.abs(leftValue - rightValue) < 1e-9, `${prompt}: stored answer does not satisfy equation`);
  } else if ((match = prompt.match(/^Jane had some stamps\. She gave away (\d+)\..* Now Jane has (\d+)\./))) {
    assert.equal(problem.answer, (Number(match[2]) + Number(match[1])) / 3);
  } else if ((match = prompt.match(/^Write (\d+\.\d+) as a fraction\.$/))) {
    const digits = match[1].replace(".", "");
    const denominator = 10 ** (match[1].length - match[1].indexOf(".") - 1);
    assertRational(problem.answer, rational(Number(digits), denominator), prompt);
  } else if ((match = prompt.match(/^(\d+(?:\.\d+)?) of (\d+) = \?$/))) {
    assert.equal(problem.answer, Number(match[1]) * Number(match[2]));
  } else if ((match = prompt.match(/^What is (\d+(?:\.\d+)?) as a percent\?$/))) {
    assert.equal(problem.answer, Number(match[1]) * 100);
  } else if ((match = prompt.match(/^(\d+)\/(\d+) is what percent\?$/))) {
    assert.equal(problem.answer, Number(match[1]) / Number(match[2]) * 100);
  } else if ((match = prompt.match(/^(\d+)\/(\d+) = what decimal\?$/))) {
    assert.equal(problem.answer, Number(match[1]) / Number(match[2]));
  } else if (prompt.endsWith(" = ?")) {
    assert.ok(Math.abs(problem.answer - evaluateTrustedArithmetic(prompt.slice(0, -4))) < 1e-9, prompt);
  } else {
    assert.fail(`no independent validator for generated prompt: ${prompt}`);
  }
}

test("all generated question families remain mathematically valid across 17,500 seeded samples", () => {
  for (let seed = 1; seed <= 10; seed += 1) {
    const context = makeMathContext(seed);
    for (const factory of factories) {
      assert.equal(typeof context[factory], "function", `${factory} must exist`);
      for (let sample = 0; sample < 50; sample += 1) {
        const problem = context[factory]();
        verifyGeneratedProblem(problem);
        assert.equal(context.isCorrect(problem.displayAnswer, problem), true, `${problem.prompt}: displayed answer must be accepted`);
      }
    }
  }
});

test("new generated question families cannot bypass the audited factory list", () => {
  const discovered = [...scriptSource.matchAll(/^function (make[A-Za-z0-9]+Problem)\(/gm)]
    .map((match) => match[1])
    .sort();
  const audited = [...factories, ...routingFactories].sort();
  assert.deepEqual(discovered, audited);
});
