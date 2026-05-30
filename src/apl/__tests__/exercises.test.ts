import { describe, it, expect } from "vitest";
import { newSession, runLine } from "../index";
import { EXERCISES } from "../../data/exercises";

/**
 * Smoke test: every shipped exercise must parse and evaluate without producing
 * an error. Exercises that use ? (roll) or ⎕TS (timestamp) are non-deterministic
 * and only asserted to run; their output is not compared.
 */

const NON_DETERMINISTIC_IDS = new Set<number>([28, 29, 104, 105]);

describe("EXERCISES smoke run", () => {
  for (const ex of EXERCISES) {
    it(`#${ex.id} ${ex.slug} :: ${ex.code.replace(/\n/g, " ⏎ ")}`, () => {
      const session = newSession();
      const results = runLine(ex.code, session);
      const errors = results.filter((r) => r.isError);
      if (errors.length > 0) {
        throw new Error(
          `exercise ${ex.id} (${ex.slug}) produced error(s): ` +
            errors.map((e) => e.output).join(" | ") +
            `  | source: ${ex.code}`
        );
      }
      // last statement should produce a value (string or empty allowed)
      expect(results.length).toBeGreaterThan(0);
    });
  }
});

/**
 * Hard-coded expected output table. Covers the deterministic exercises.
 * Keep this aligned with the documented examples in registry.ts.
 */
interface ExpectedOutput {
  id: number;
  expected: string;
}

const EXPECTED: ExpectedOutput[] = [
  { id: 1, expected: "55" },
  { id: 2, expected: "120" },
  { id: 3, expected: "1" },
  { id: 4, expected: "9" },
  { id: 5, expected: "6" },
  { id: 6, expected: "7" },
  { id: 7, expected: "2 4 6 8 10 12 14 16 18 20" },
  { id: 8, expected: "1 3 5 7 9 11 13 15 17 19" },
  { id: 9, expected: "1 4 9 16 25 36 49 64 81 100" },
  { id: 10, expected: "1 8 27 64 125" },
  { id: 11, expected: "5 4 3 2 1" },
  { id: 12, expected: "1 1 2 3 4 5 6 9" },
  { id: 13, expected: "9 6 5 4 3 2 1 1" },
  { id: 14, expected: "1 2 3 4 5" },
  { id: 15, expected: "10" },
  { id: 16, expected: "30" },
  { id: 17, expected: "2 3 4 5" },
  { id: 18, expected: "1 2 3 4" },
  { id: 19, expected: "10 20 30" },
  { id: 20, expected: "30 40 50" },
  { id: 21, expected: "0 1 0 1 0 1 0 1 0 1" },
  { id: 22, expected: "25" },
  { id: 23, expected: "2550" },
  { id: 24, expected: "12" },
  { id: 25, expected: "5" },
  { id: 26, expected: "3 1 0 2 4" },
  { id: 27, expected: "¯1 2 ¯3 4" },
  { id: 30, expected: "3.141592653589793 2.718281828459045" },
  { id: 33, expected: "¯1 0 1 ¯1" },
  { id: 34, expected: "4 3" },
  { id: 35, expected: "385" },
  { id: 36, expected: "2 4 5" },
  { id: 37, expected: "0 1 0 1 0" },
  { id: 38, expected: "3" },
  { id: 39, expected: "1 3 6 10 15" },
  { id: 40, expected: "1 2 6 24 120" },
  { id: 41, expected: "3 3 4 4 5 9 9 9" },
  { id: 42, expected: "6" },
  { id: 43, expected: "2" },
  { id: 45, expected: "1 2 3 4" },
  { id: 46, expected: "4" },
  { id: 47, expected: "1 2 3 4 5" },
  { id: 48, expected: "3 4" },
  { id: 49, expected: "¯1 1 ¯1 1 1" },
  { id: 50, expected: "0 0.5 1" },
  { id: 51, expected: "0 0 0 2 4" },
  { id: 53, expected: "10 26 42" },
  { id: 54, expected: "15 18 21 24" },
  { id: 59, expected: "32" },
  { id: 61, expected: "11" },
  { id: 62, expected: "0 0 0 0 1 0 1 1" },
  { id: 63, expected: "3" },
  { id: 64, expected: "1 2" },
  { id: 65, expected: "1 6 15 20 15 6 1" },
  { id: 66, expected: "5040" },
  { id: 67, expected: "1" },
  { id: 68, expected: "3" },
  { id: 69, expected: "5" },
  { id: 71, expected: "ouaio" },
  { id: 75, expected: "49" },
  { id: 76, expected: "1 4 9 16 25" },
  { id: 77, expected: "1 4 9 16" },
  { id: 78, expected: "¯7" },
  { id: 79, expected: "10" },
  { id: 80, expected: "12" },
  { id: 81, expected: "55" },
  { id: 82, expected: "1 3 5" },
  { id: 83, expected: "abbccc" },
  { id: 85, expected: "3 4 5 1 2" },
  { id: 86, expected: "5" },
  { id: 87, expected: "3" },
  { id: 88, expected: "0" },
  { id: 89, expected: "2 3 5 7 11 13 17 19" },
  { id: 91, expected: "6" },
  { id: 92, expected: "syarra" },
  { id: 93, expected: "7" },
  { id: 95, expected: "256" },
  { id: 97, expected: "25" },
  { id: 98, expected: "14" },
  { id: 99, expected: "20 30 40" },
  { id: 100, expected: "256" },
  { id: 101, expected: "1" },
  { id: 102, expected: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  { id: 103, expected: "0123456789" },
  { id: 106, expected: "ZYXWVUTSRQPONMLKJIHGFEDCBA" },
  { id: 107, expected: "3" },
  { id: 108, expected: "55" },
  { id: 110, expected: "10" },
  { id: 111, expected: "5050" },
  { id: 112, expected: "5" },
  { id: 113, expected: "3 1 20" },
  { id: 114, expected: "4 2" },
  { id: 115, expected: "120" },
  { id: 138, expected: "1" },
  { id: 139, expected: "8" },
  { id: 140, expected: "3" },
  { id: 141, expected: "1" },
  { id: 142, expected: "1" },
  { id: 143, expected: "3 2 4" },
  { id: 144, expected: "9" },
  { id: 145, expected: "l" },
  { id: 146, expected: "5" },
  { id: 147, expected: "9" },
  { id: 148, expected: "1 2 5" },
  { id: 149, expected: "3" },
  { id: 150, expected: "4" },
  { id: 151, expected: "5 9" },
  { id: 152, expected: "3" },
  { id: 153, expected: "3" },
  { id: 154, expected: "11" },
  { id: 155, expected: "7 0 8 0 9 0 10" },
  { id: 156, expected: "3 5 5 2 5" },
  { id: 157, expected: "4" },
];

describe("EXERCISES expected outputs", () => {
  for (const { id, expected } of EXPECTED) {
    const ex = EXERCISES.find((e) => e.id === id);
    if (!ex) continue;
    it(`#${id} ${ex.slug} -> "${expected}"`, () => {
      const session = newSession();
      const results = runLine(ex.code, session);
      const last = results[results.length - 1];
      expect(last.isError, last.output).toBe(false);
      expect(last.output).toBe(expected);
    });
  }
});

describe("EXERCISES non-deterministic", () => {
  for (const id of NON_DETERMINISTIC_IDS) {
    const ex = EXERCISES.find((e) => e.id === id);
    if (!ex) continue;
    it(`#${id} ${ex.slug} runs without error`, () => {
      const session = newSession();
      const results = runLine(ex.code, session);
      const last = results[results.length - 1];
      expect(last.isError).toBe(false);
      expect(last.output.length).toBeGreaterThan(0);
    });
  }
});
