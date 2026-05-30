/**
 * Glyph registry. Every entry pairs a literal glyph character with its
 * translation slug, UI category, kind (function, operator, or syntax), and
 * the runtime implementations plus example expressions used by the
 * reference panel. Tokenizer, parser, evaluator, and on-screen keyboard
 * derive their tables from this list.
 */

import type { APLArray } from "./types";
import * as P from "./primitives";

export type GlyphCategory =
  | "arithmetic"
  | "comparison"
  | "logical"
  | "structural"
  | "selection"
  | "operators"
  | "misc";

export type GlyphKind = "function" | "operator" | "syntax";

export interface GlyphExample {
  expr: string;
  result: string;
  /** When true, an i18n note exists at `glyphs.<slug>.exampleNotes.{mo|dy}<index>`. */
  hasNote?: boolean;
}

export interface GlyphEntry {
  glyph: string;
  slug: string;
  category: GlyphCategory;
  kind: GlyphKind;
  monadic?: (a: APLArray) => APLArray;
  dyadic?: (a: APLArray, b: APLArray) => APLArray;
  monadicExamples?: GlyphExample[];
  dyadicExamples?: GlyphExample[];
  unsupported?: boolean;
}

export const REGISTRY: GlyphEntry[] = [
  /* ---------- arithmetic ---------- */
  {
    glyph: "+",
    slug: "plus",
    category: "arithmetic",
    kind: "function",
    monadic: P.plusMo,
    dyadic: P.plusDy,
    monadicExamples: [{ expr: "+ ¯3", result: "¯3" }],
    dyadicExamples: [
      { expr: "2 + 3", result: "5" },
      { expr: "1 2 3 + 10", result: "11 12 13" },
      { expr: "1 2 3 + 10 20 30", result: "11 22 33" },
    ],
  },
  {
    glyph: "-",
    slug: "minus",
    category: "arithmetic",
    kind: "function",
    monadic: P.minusMo,
    dyadic: P.minusDy,
    monadicExamples: [{ expr: "- 1 2 3", result: "¯1 ¯2 ¯3" }],
    dyadicExamples: [{ expr: "10 - 3", result: "7" }],
  },
  {
    glyph: "×",
    slug: "times",
    category: "arithmetic",
    kind: "function",
    monadic: P.timesMo,
    dyadic: P.timesDy,
    monadicExamples: [{ expr: "× ¯7 0 7", result: "¯1 0 1" }],
    dyadicExamples: [{ expr: "3 × 4", result: "12" }],
  },
  {
    glyph: "÷",
    slug: "divide",
    category: "arithmetic",
    kind: "function",
    monadic: P.divideMo,
    dyadic: P.divideDy,
    monadicExamples: [{ expr: "÷ 4", result: "0.25" }],
    dyadicExamples: [{ expr: "10 ÷ 4", result: "2.5" }],
  },
  {
    glyph: "*",
    slug: "power",
    category: "arithmetic",
    kind: "function",
    monadic: P.powerMo,
    dyadic: P.powerDy,
    monadicExamples: [{ expr: "* 1", result: "2.718281828459045" }],
    dyadicExamples: [{ expr: "2 * 10", result: "1024" }],
  },
  {
    glyph: "⍟",
    slug: "log",
    category: "arithmetic",
    kind: "function",
    monadic: P.logMo,
    dyadic: P.logDy,
    monadicExamples: [{ expr: "⍟ * 1", result: "1" }],
    dyadicExamples: [{ expr: "2 ⍟ 1024", result: "10" }],
  },
  {
    glyph: "⌈",
    slug: "ceiling",
    category: "arithmetic",
    kind: "function",
    monadic: P.maxMo,
    dyadic: P.maxDy,
    monadicExamples: [{ expr: "⌈ 3.2", result: "4" }],
    dyadicExamples: [{ expr: "5 ⌈ 7", result: "7" }],
  },
  {
    glyph: "⌊",
    slug: "floor",
    category: "arithmetic",
    kind: "function",
    monadic: P.minMo,
    dyadic: P.minDy,
    monadicExamples: [{ expr: "⌊ 3.8", result: "3" }],
    dyadicExamples: [{ expr: "5 ⌊ 7", result: "5" }],
  },
  {
    glyph: "|",
    slug: "residue",
    category: "arithmetic",
    kind: "function",
    monadic: P.absMo,
    dyadic: P.modDy,
    monadicExamples: [{ expr: "| ¯7", result: "7" }],
    dyadicExamples: [{ expr: "3 | 10", result: "1" }],
  },
  {
    glyph: "!",
    slug: "factorial",
    category: "arithmetic",
    kind: "function",
    monadic: P.factorialMo,
    dyadic: P.binomialDy,
    monadicExamples: [{ expr: "! 5", result: "120" }],
    dyadicExamples: [{ expr: "2 ! 5", result: "10" }],
  },
  {
    glyph: "?",
    slug: "roll",
    category: "arithmetic",
    kind: "function",
    monadic: P.rollMo,
    monadicExamples: [{ expr: "? 6", result: "(1..6)", hasNote: true }],
  },
  {
    glyph: "○",
    slug: "circle",
    category: "arithmetic",
    kind: "function",
    monadic: P.circleMo,
    dyadic: P.circleDy,
    monadicExamples: [{ expr: "○ 1", result: "3.141592653589793" }],
    dyadicExamples: [{ expr: "1 ○ ○ ÷ 2", result: "1" }],
  },

  /* ---------- comparison ---------- */
  {
    glyph: "<",
    slug: "lt",
    category: "comparison",
    kind: "function",
    dyadic: P.ltDy,
    dyadicExamples: [{ expr: "3 < 5", result: "1" }],
  },
  {
    glyph: "≤",
    slug: "le",
    category: "comparison",
    kind: "function",
    dyadic: P.leDy,
    dyadicExamples: [{ expr: "5 ≤ 5", result: "1" }],
  },
  {
    glyph: "=",
    slug: "eq",
    category: "comparison",
    kind: "function",
    dyadic: P.eqDy,
    dyadicExamples: [{ expr: "1 2 3 = 1 2 4", result: "1 1 0" }],
  },
  {
    glyph: "≥",
    slug: "ge",
    category: "comparison",
    kind: "function",
    dyadic: P.geDy,
    dyadicExamples: [{ expr: "5 ≥ 5", result: "1" }],
  },
  {
    glyph: ">",
    slug: "gt",
    category: "comparison",
    kind: "function",
    dyadic: P.gtDy,
    dyadicExamples: [{ expr: "7 > 3", result: "1" }],
  },
  {
    glyph: "≠",
    slug: "ne",
    category: "comparison",
    kind: "function",
    dyadic: P.neDy,
    dyadicExamples: [{ expr: "1 2 3 ≠ 1 2 4", result: "0 0 1" }],
  },
  {
    glyph: "≡",
    slug: "match",
    category: "comparison",
    kind: "function",
    monadic: P.matchMo,
    dyadic: P.matchDy,
    monadicExamples: [
      { expr: "≡ 1 2 3", result: "1" },
      { expr: "≡ 5", result: "0" },
    ],
    dyadicExamples: [
      { expr: "1 2 3 ≡ 1 2 3", result: "1" },
      { expr: "1 2 3 ≡ 1 2 4", result: "0" },
    ],
  },
  {
    glyph: "≢",
    slug: "notMatch",
    category: "comparison",
    kind: "function",
    monadic: P.tallyMo,
    dyadic: P.notMatchDy,
    monadicExamples: [
      { expr: "≢ 1 2 3 4", result: "4" },
      { expr: "≢ 'hello'", result: "5" },
    ],
    dyadicExamples: [{ expr: "1 2 3 ≢ 1 2 4", result: "1" }],
  },

  /* ---------- logical ---------- */
  {
    glyph: "∧",
    slug: "and",
    category: "logical",
    kind: "function",
    dyadic: P.andDy,
    dyadicExamples: [{ expr: "1 1 0 ∧ 1 0 0", result: "1 0 0" }],
  },
  {
    glyph: "∨",
    slug: "or",
    category: "logical",
    kind: "function",
    dyadic: P.orDy,
    dyadicExamples: [{ expr: "1 1 0 ∨ 0 0 0", result: "1 1 0" }],
  },
  {
    glyph: "⍲",
    slug: "nand",
    category: "logical",
    kind: "function",
    dyadic: P.nandDy,
    dyadicExamples: [{ expr: "1 1 0 ⍲ 1 0 0", result: "0 1 1" }],
  },
  {
    glyph: "⍱",
    slug: "nor",
    category: "logical",
    kind: "function",
    dyadic: P.norDy,
    dyadicExamples: [{ expr: "0 0 1 ⍱ 0 1 0", result: "1 0 0" }],
  },
  {
    glyph: "~",
    slug: "not",
    category: "logical",
    kind: "function",
    monadic: P.notMo,
    monadicExamples: [{ expr: "~ 1 0 1 0", result: "0 1 0 1" }],
  },

  /* ---------- structural ---------- */
  {
    glyph: "⍴",
    slug: "shape",
    category: "structural",
    kind: "function",
    monadic: P.shapeMo,
    dyadic: P.shapeDy,
    monadicExamples: [
      { expr: "⍴ 1 2 3", result: "3" },
      { expr: "⍴ 2 3 ⍴ ⍳ 6", result: "2 3" },
    ],
    dyadicExamples: [
      { expr: "3 4 ⍴ ⍳ 12", result: "1  2  3  4\n5  6  7  8\n9 10 11 12" },
    ],
  },
  {
    glyph: ",",
    slug: "ravel",
    category: "structural",
    kind: "function",
    monadic: P.ravelMo,
    dyadic: P.ravelDy,
    monadicExamples: [{ expr: ", 2 2 ⍴ 1 2 3 4", result: "1 2 3 4" }],
    dyadicExamples: [{ expr: "1 2 3 , 4 5", result: "1 2 3 4 5" }],
  },
  {
    glyph: "⍪",
    slug: "table",
    category: "structural",
    kind: "function",
    monadic: P.tableMo,
    dyadic: P.tableDy,
    monadicExamples: [{ expr: "⍪ 1 2 3", result: "1\n2\n3" }],
    dyadicExamples: [
      {
        expr: "(2 3⍴⍳6) ⍪ (2 3⍴10×⍳6)",
        result: " 1  2  3\n 4  5  6\n10 20 30\n40 50 60",
      },
    ],
  },
  {
    glyph: "⌽",
    slug: "reverseLast",
    category: "structural",
    kind: "function",
    monadic: P.reverseLastMo,
    dyadic: P.rotateLastDy,
    monadicExamples: [{ expr: "⌽ 1 2 3 4", result: "4 3 2 1" }],
    dyadicExamples: [{ expr: "2 ⌽ 1 2 3 4 5", result: "3 4 5 1 2" }],
  },
  {
    glyph: "⊖",
    slug: "reverseFirst",
    category: "structural",
    kind: "function",
    monadic: P.reverseFirstMo,
    dyadic: P.rotateFirstDy,
    monadicExamples: [{ expr: "⊖ 3 2 ⍴ ⍳ 6", result: "5 6\n3 4\n1 2" }],
    dyadicExamples: [{ expr: "1 ⊖ 3 2 ⍴ ⍳ 6", result: "3 4\n5 6\n1 2" }],
  },
  {
    glyph: "⍉",
    slug: "transpose",
    category: "structural",
    kind: "function",
    monadic: P.transposeMo,
    monadicExamples: [{ expr: "⍉ 2 3 ⍴ ⍳ 6", result: "1 4\n2 5\n3 6" }],
  },
  {
    glyph: "⍳",
    slug: "iota",
    category: "structural",
    kind: "function",
    monadic: P.iotaMo,
    dyadic: P.iotaDy,
    monadicExamples: [{ expr: "⍳ 5", result: "1 2 3 4 5" }],
    dyadicExamples: [{ expr: "'abcde' ⍳ 'cae'", result: "3 1 5" }],
  },
  {
    glyph: "⊂",
    slug: "enclose",
    category: "structural",
    kind: "function",
    monadic: P.encloseMo,
    monadicExamples: [{ expr: "⊂ 1 2 3", result: "(boxed vector)" }],
  },
  {
    glyph: "⊃",
    slug: "disclose",
    category: "structural",
    kind: "function",
    monadic: P.discloseMo,
    monadicExamples: [{ expr: "⊃ 1 2 3", result: "1" }],
  },
  {
    glyph: "⍕",
    slug: "format",
    category: "structural",
    kind: "function",
    monadic: P.formatMo,
    monadicExamples: [{ expr: "⍕ 1 2 3", result: "1 2 3" }],
  },
  {
    glyph: "⍋",
    slug: "gradeUp",
    category: "structural",
    kind: "function",
    monadic: P.gradeUpMo,
    monadicExamples: [
      { expr: "⍋ 3 1 4 1 5 9 2 6", result: "2 4 7 1 3 5 8 6" },
    ],
  },
  {
    glyph: "⍒",
    slug: "gradeDown",
    category: "structural",
    kind: "function",
    monadic: P.gradeDownMo,
    monadicExamples: [
      { expr: "⍒ 3 1 4 1 5 9 2 6", result: "6 8 5 3 1 7 2 4" },
    ],
  },
  {
    glyph: "⊆",
    slug: "partition",
    category: "structural",
    kind: "function",
    monadic: P.nestMo,
    dyadic: P.partitionDy,
    monadicExamples: [
      { expr: "⊆ 5", result: "5" },
      { expr: "≡ ⊆ 1 2 3", result: "2" },
    ],
    dyadicExamples: [
      { expr: "≢ 1 1 2 2 0 3 3 ⊆ 'abcdefg'", result: "3" },
      { expr: "⊃ 1 1 2 2 0 3 3 ⊆ 'abcdefg'", result: "ab" },
      { expr: "≢ 0 1 0 1 ⊆ 'abcd'", result: "2" },
    ],
  },

  /* ---------- selection ---------- */
  {
    glyph: "↑",
    slug: "take",
    category: "structural",
    kind: "function",
    dyadic: P.takeDy,
    dyadicExamples: [{ expr: "3 ↑ 1 2 3 4 5", result: "1 2 3" }],
  },
  {
    glyph: "↓",
    slug: "drop",
    category: "structural",
    kind: "function",
    dyadic: P.dropDy,
    dyadicExamples: [{ expr: "2 ↓ 1 2 3 4 5", result: "3 4 5" }],
  },
  {
    glyph: "∊",
    slug: "member",
    category: "selection",
    kind: "function",
    dyadic: P.memberDy,
    dyadicExamples: [{ expr: "1 2 3 4 ∊ 2 4 6", result: "0 1 0 1" }],
  },
  {
    glyph: "⍷",
    slug: "find",
    category: "selection",
    kind: "function",
    dyadic: P.findDy,
    dyadicExamples: [{ expr: "'ab' ⍷ 'cababd'", result: "0 1 0 1 0 0" }],
  },
  {
    glyph: "∪",
    slug: "unique",
    category: "selection",
    kind: "function",
    monadic: P.uniqueMo,
    dyadic: P.unionDy,
    monadicExamples: [{ expr: "∪ 1 2 2 3 1", result: "1 2 3" }],
    dyadicExamples: [{ expr: "1 2 3 ∪ 3 4 5", result: "1 2 3 4 5" }],
  },
  {
    glyph: "∩",
    slug: "intersect",
    category: "selection",
    kind: "function",
    dyadic: P.intersectDy,
    dyadicExamples: [{ expr: "1 2 3 ∩ 2 3 4", result: "2 3" }],
  },
  {
    glyph: "⍸",
    slug: "where",
    category: "selection",
    kind: "function",
    monadic: P.whereMo,
    monadicExamples: [{ expr: "⍸ 0 1 0 1 1", result: "2 4 5" }],
  },
  {
    glyph: "⌷",
    slug: "pick",
    category: "selection",
    kind: "function",
    dyadic: P.pickDy,
    dyadicExamples: [{ expr: "2 ⌷ 10 20 30", result: "20" }],
  },
  {
    glyph: "⊥",
    slug: "decode",
    category: "selection",
    kind: "function",
    dyadic: P.decodeDy,
    dyadicExamples: [{ expr: "2 ⊥ 1 0 1 1", result: "11" }],
  },
  {
    glyph: "⊤",
    slug: "encode",
    category: "selection",
    kind: "function",
    dyadic: P.encodeDy,
    dyadicExamples: [{ expr: "2 2 2 2 ⊤ 11", result: "1 0 1 1" }],
  },
  {
    glyph: "⌹",
    slug: "matInv",
    category: "selection",
    kind: "function",
    monadic: P.matInvMo,
    monadicExamples: [
      { expr: "⌹ 2 2 ⍴ 1 2 3 4", result: "¯2  1\n1.5 ¯0.5" },
    ],
  },

  /* ---------- operators ---------- */
  {
    glyph: "/",
    slug: "reduce",
    category: "operators",
    kind: "operator",
    monadicExamples: [
      { expr: "+/ 1 2 3 4 5", result: "15" },
      { expr: "×/ 1 2 3 4 5", result: "120" },
    ],
    dyadicExamples: [
      { expr: "1 0 1 0 1 / 1 2 3 4 5", result: "1 3 5" },
      { expr: "2 3 1 / 'abc'", result: "aabbbc" },
    ],
  },
  {
    glyph: "⌿",
    slug: "reduceFirst",
    category: "operators",
    kind: "operator",
    monadicExamples: [{ expr: "+⌿ 3 2 ⍴ ⍳ 6", result: "9 12" }],
  },
  {
    glyph: "\\",
    slug: "scan",
    category: "operators",
    kind: "operator",
    monadicExamples: [{ expr: "+\\ 1 2 3 4 5", result: "1 3 6 10 15" }],
    dyadicExamples: [
      { expr: "1 0 1 0 1 \\ 7 8 9", result: "7 0 8 0 9" },
    ],
  },
  {
    glyph: "⍀",
    slug: "scanFirst",
    category: "operators",
    kind: "operator",
    monadicExamples: [{ expr: "+⍀ 3 2 ⍴ ⍳ 6", result: "1 2\n4 6\n9 12" }],
  },
  {
    glyph: "¨",
    slug: "each",
    category: "operators",
    kind: "operator",
    monadicExamples: [{ expr: "{⍵*2}¨ 1 2 3 4", result: "1 4 9 16" }],
  },
  {
    glyph: "⍨",
    slug: "commute",
    category: "operators",
    kind: "operator",
    monadicExamples: [
      { expr: "+⍨ 5", result: "10" },
      { expr: "10 -⍨ 3", result: "¯7" },
    ],
  },
  {
    glyph: ".",
    slug: "dot",
    category: "operators",
    kind: "operator",
    dyadicExamples: [{ expr: "1 2 3 +.× 4 5 6", result: "32" }],
  },
  {
    glyph: "∘",
    slug: "outer",
    category: "operators",
    kind: "operator",
    dyadicExamples: [
      { expr: "1 2 3 ∘.× 1 2 3", result: "1 2 3\n2 4 6\n3 6 9" },
    ],
  },
  {
    glyph: "⍣",
    slug: "powerOp",
    category: "operators",
    kind: "operator",
    monadicExamples: [
      { expr: "{⍵+1}⍣5 ⊢ 0", result: "5" },
      { expr: "{⍵×2}⍣3 ⊢ 1", result: "8" },
    ],
  },
  {
    glyph: "⍤",
    slug: "rank",
    category: "operators",
    kind: "operator",
    monadicExamples: [
      { expr: "+/⍤1 ⊢ 3 4 ⍴ ⍳12", result: "10 26 42" },
    ],
  },
  {
    glyph: "@",
    slug: "at",
    category: "operators",
    kind: "operator",
    monadicExamples: [
      { expr: "{0}@2 ⊢ 1 2 3 4 5", result: "1 0 3 4 5" },
    ],
  },

  /* ---------- misc / syntax ---------- */
  {
    glyph: "⊣",
    slug: "tackLeft",
    category: "misc",
    kind: "function",
    monadic: P.tackLeftMo,
    dyadic: P.tackLeftDy,
    monadicExamples: [{ expr: "⊣ 1 2 3", result: "1 2 3" }],
    dyadicExamples: [{ expr: "1 ⊣ 999", result: "1" }],
  },
  {
    glyph: "⊢",
    slug: "tackRight",
    category: "misc",
    kind: "function",
    monadic: P.tackRightMo,
    dyadic: P.tackRightDy,
    monadicExamples: [{ expr: "⊢ 1 2 3", result: "1 2 3" }],
    dyadicExamples: [{ expr: "999 ⊢ 1", result: "1" }],
  },
  {
    glyph: "←",
    slug: "assign",
    category: "misc",
    kind: "syntax",
    dyadicExamples: [
      { expr: "x ← 10\nx + 1", result: "11" },
      { expr: "sum ← +/\nsum ⍳ 10", result: "55" },
    ],
  },
  {
    glyph: "⋄",
    slug: "diamond",
    category: "misc",
    kind: "syntax",
    monadicExamples: [{ expr: "x ← 3 ⋄ x × x", result: "9" }],
  },
  {
    glyph: "⍝",
    slug: "comment",
    category: "misc",
    kind: "syntax",
    monadicExamples: [{ expr: "+/⍳10 ⍝ sum of first ten", result: "55" }],
  },
  {
    glyph: "⍵",
    slug: "omega",
    category: "misc",
    kind: "syntax",
    monadicExamples: [{ expr: "{⍵*2} 5", result: "25" }],
  },
  {
    glyph: "⍺",
    slug: "alpha",
    category: "misc",
    kind: "syntax",
    dyadicExamples: [{ expr: "3 {⍺+⍵} 4", result: "7" }],
  },
  {
    glyph: "¯",
    slug: "highMinus",
    category: "misc",
    kind: "syntax",
    monadicExamples: [{ expr: "¯3 + 5", result: "2" }],
  },
  {
    glyph: "{",
    slug: "dfnOpen",
    category: "misc",
    kind: "syntax",
    monadicExamples: [{ expr: "{⍵+1} 9", result: "10" }],
  },
  {
    glyph: "}",
    slug: "dfnClose",
    category: "misc",
    kind: "syntax",
    monadicExamples: [{ expr: "{⍺×⍵} ⍝ closes the dfn body", result: "" }],
  },
  {
    glyph: "'",
    slug: "stringQuote",
    category: "misc",
    kind: "syntax",
    monadicExamples: [{ expr: "'hello'", result: "hello" }],
  },
  {
    glyph: "⎕",
    slug: "quad",
    category: "misc",
    kind: "syntax",
    monadicExamples: [
      { expr: "⎕IO", result: "1" },
      { expr: "⎕A", result: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
      { expr: "⎕D", result: "0123456789" },
      { expr: "⎕TS", result: "(current timestamp)" },
    ],
  },
  {
    glyph: "_",
    slug: "underscore",
    category: "misc",
    kind: "syntax",
    monadicExamples: [{ expr: "my_var ← 5 ⋄ my_var", result: "5" }],
  },
  {
    glyph: "∇",
    slug: "del",
    category: "misc",
    kind: "syntax",
    monadicExamples: [
      {
        expr: "∇ inc ← {⍵+1} ∇\ninc 9",
        result: "10",
      },
    ],
  },
  {
    glyph: "∆",
    slug: "delta",
    category: "misc",
    kind: "syntax",
    monadicExamples: [{ expr: "∆x ← 0.5", result: "0.5" }],
  },
  {
    glyph: "⍎",
    slug: "execute",
    category: "misc",
    kind: "function",
    monadicExamples: [
      { expr: "⍎ '1+2'", result: "3" },
      { expr: "⍎ '+/⍳10'", result: "55" },
    ],
  },
  {
    glyph: "⍬",
    slug: "zilde",
    category: "misc",
    kind: "syntax",
    monadicExamples: [
      { expr: "⍴ ⍬", result: "0" },
      { expr: "≢ ⍬", result: "0" },
      { expr: "⍬ , 1 2 3", result: "1 2 3" },
      { expr: "+/ ⍬", result: "0" },
    ],
  },
  {
    glyph: "⍞",
    slug: "quoteQuad",
    category: "misc",
    kind: "syntax",
    monadicExamples: [
      { expr: "⍴ ⍞", result: "0" },
      { expr: "≢ ⍞", result: "0" },
    ],
  },
];

/* ---------- derived lookup tables ---------- */

/** Every glyph character known to the language (function + operator + syntax). */
export const ALL_GLYPH_CHARS: ReadonlySet<string> = new Set(
  REGISTRY.map((e) => e.glyph)
);

/** Glyph characters that act as functions (primitive verb position). */
export const FUNCTION_GLYPH_CHARS: ReadonlySet<string> = new Set(
  REGISTRY.filter((e) => e.kind === "function").map((e) => e.glyph)
);

/** Glyph characters that act as monadic operators (suffix-binding to a function). */
export const MONADIC_OPERATOR_CHARS: ReadonlySet<string> = new Set(
  ["/", "\\", "¨", "⌿", "⍀", "⍨"]
);

/** Map glyph -> monadic implementation, for function-kind entries that have one. */
export const MONADIC_DISPATCH: ReadonlyMap<
  string,
  (a: APLArray) => APLArray
> = new Map(
  REGISTRY.filter((e) => e.kind === "function" && e.monadic).map((e) => [
    e.glyph,
    e.monadic!,
  ])
);

/** Map glyph -> dyadic implementation, for function-kind entries that have one. */
export const DYADIC_DISPATCH: ReadonlyMap<
  string,
  (a: APLArray, b: APLArray) => APLArray
> = new Map(
  REGISTRY.filter((e) => e.kind === "function" && e.dyadic).map((e) => [
    e.glyph,
    e.dyadic!,
  ])
);

/** Look up an entry by its glyph character. */
export const findByGlyph = (g: string): GlyphEntry | undefined =>
  REGISTRY.find((e) => e.glyph === g);
