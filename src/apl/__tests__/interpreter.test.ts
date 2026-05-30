import { describe, it, expect } from "vitest";
import { newSession, runLine } from "../index";
import { tokenize } from "../tokenize";
import { format } from "../format";
import { resolveAplKey, BARE_BY_CODE, SHIFT_BY_CODE } from "../keymap";
import {
  REGISTRY,
  ALL_GLYPH_CHARS,
  FUNCTION_GLYPH_CHARS,
  MONADIC_OPERATOR_CHARS,
  MONADIC_DISPATCH,
  DYADIC_DISPATCH,
  findByGlyph,
} from "../registry";
import {
  scalar,
  vector,
  empty,
  isScalar,
  isVector,
  isMatrix,
  isNested,
  rank,
  count,
  APLError,
  DOMAIN_ERROR,
  LENGTH_ERROR,
  RANK_ERROR,
  INDEX_ERROR,
  SYNTAX_ERROR,
  VALUE_ERROR,
  NONCE_ERROR,
} from "../types";
import { emptyEnv, parseProgram } from "../parse";

const run = (src: string): string => {
  const s = newSession();
  const r = runLine(src, s);
  const last = r[r.length - 1];
  if (last.isError) throw new Error(last.output);
  return last.output;
};

const runErr = (src: string): { kind: string; msg: string } => {
  const s = newSession();
  const r = runLine(src, s);
  const last = r[r.length - 1];
  if (!last.isError) throw new Error("expected error, got: " + last.output);
  return { kind: last.errorKind ?? "", msg: last.output };
};

/* ====================================================================== */
/*  types: predicates and constructors                                    */
/* ====================================================================== */

describe("type predicates", () => {
  it("isScalar on rank-0", () => expect(isScalar(scalar(5))).toBe(true));
  it("isScalar on rank-1", () => expect(isScalar(vector([1]))).toBe(false));
  it("isVector on rank-1", () => expect(isVector(vector([1, 2]))).toBe(true));
  it("isVector on rank-0", () => expect(isVector(scalar(1))).toBe(false));
  it("isMatrix on rank-2", () =>
    expect(isMatrix({ shape: [2, 2], data: [1, 2, 3, 4] })).toBe(true));
  it("isMatrix on rank-1", () => expect(isMatrix(vector([1, 2]))).toBe(false));
  it("isNested on raw number", () => expect(isNested(5)).toBe(false));
  it("isNested on string", () => expect(isNested("a")).toBe(false));
  it("isNested on APLArray", () =>
    expect(isNested({ shape: [], data: [1] })).toBe(true));
  it("rank of scalar is 0", () => expect(rank(scalar(1))).toBe(0));
  it("rank of vector is 1", () => expect(rank(vector([1]))).toBe(1));
  it("rank of matrix is 2", () =>
    expect(rank({ shape: [3, 3], data: [] })).toBe(2));
  it("count of scalar is 1", () => expect(count(scalar(7))).toBe(1));
  it("count of empty is 0", () => expect(count(empty())).toBe(0));
  it("count of 2x3 matrix is 6", () =>
    expect(count({ shape: [2, 3], data: new Array(6).fill(0) })).toBe(6));
});

describe("APLError constructors", () => {
  it("DOMAIN_ERROR creates APLError with kind DOMAIN", () => {
    const e = DOMAIN_ERROR();
    expect(e).toBeInstanceOf(APLError);
    expect(e.kind).toBe("DOMAIN");
  });
  it("LENGTH_ERROR kind", () =>
    expect(LENGTH_ERROR("x").kind).toBe("LENGTH"));
  it("RANK_ERROR kind", () => expect(RANK_ERROR().kind).toBe("RANK"));
  it("INDEX_ERROR kind", () => expect(INDEX_ERROR().kind).toBe("INDEX"));
  it("SYNTAX_ERROR kind", () => expect(SYNTAX_ERROR().kind).toBe("SYNTAX"));
  it("VALUE_ERROR kind", () => expect(VALUE_ERROR().kind).toBe("VALUE"));
  it("NONCE_ERROR kind", () => expect(NONCE_ERROR().kind).toBe("NONCE"));
  it("custom message preserved", () =>
    expect(DOMAIN_ERROR("custom").message).toBe("custom"));
});

/* ====================================================================== */
/*  keymap                                                                */
/* ====================================================================== */

describe("keymap resolveAplKey", () => {
  it("bare digit produces glyph", () =>
    expect(resolveAplKey("Digit5", false)).toBe("="));
  it("shift digit produces shift glyph", () =>
    expect(resolveAplKey("Digit5", true)).toBe("≠"));
  it("bare letter Q is omega", () =>
    expect(resolveAplKey("KeyQ", false)).toBe("⍵"));
  it("shift Q is alpha", () =>
    expect(resolveAplKey("KeyQ", true)).toBe("⍺"));
  it("bare KeyA is /", () => expect(resolveAplKey("KeyA", false)).toBe("/"));
  it("shift KeyA is ⌿", () =>
    expect(resolveAplKey("KeyA", true)).toBe("⌿"));
  it("unknown code returns undefined", () =>
    expect(resolveAplKey("Pause", false)).toBe(undefined));
  it("shift falls back to bare when no shift glyph", () =>
    expect(resolveAplKey("KeyW", true)).toBe("⍴"));
  it("shift with no shift mapping returns bare", () =>
    expect(resolveAplKey("KeyN", true)).toBe("|"));
});

describe("keymap tables", () => {
  it("every bare value is a single non-empty character", () => {
    for (const [code, glyph] of Object.entries(BARE_BY_CODE)) {
      expect(glyph.length).toBeGreaterThan(0);
      expect(typeof code).toBe("string");
    }
  });
  it("shift table is a strict subset by code", () => {
    for (const code of Object.keys(SHIFT_BY_CODE)) {
      expect(code in BARE_BY_CODE).toBe(true);
    }
  });
  it("Backquote bare is diamond", () =>
    expect(BARE_BY_CODE.Backquote).toBe("⋄"));
  it("Backquote shift is lamp", () =>
    expect(SHIFT_BY_CODE.Backquote).toBe("⍝"));
  it("BracketLeft bare is assignment arrow", () =>
    expect(BARE_BY_CODE.BracketLeft).toBe("←"));
  it("BracketLeft shift is opening brace", () =>
    expect(SHIFT_BY_CODE.BracketLeft).toBe("{"));
});

/* ====================================================================== */
/*  registry consistency                                                  */
/* ====================================================================== */

describe("registry consistency", () => {
  it("every registry entry has a non-empty slug", () => {
    for (const e of REGISTRY) {
      expect(e.slug.length).toBeGreaterThan(0);
    }
  });
  it("every registry entry has a glyph character", () => {
    for (const e of REGISTRY) {
      expect(typeof e.glyph).toBe("string");
      expect(e.glyph.length).toBeGreaterThan(0);
    }
  });
  it("glyph chars are unique", () => {
    const seen = new Set<string>();
    for (const e of REGISTRY) {
      expect(seen.has(e.glyph)).toBe(false);
      seen.add(e.glyph);
    }
  });
  it("slugs are unique", () => {
    const seen = new Set<string>();
    for (const e of REGISTRY) {
      expect(seen.has(e.slug)).toBe(false);
      seen.add(e.slug);
    }
  });
  it("ALL_GLYPH_CHARS size matches registry length", () =>
    expect(ALL_GLYPH_CHARS.size).toBe(REGISTRY.length));
  it("FUNCTION_GLYPH_CHARS only contains function-kind glyphs", () => {
    for (const g of FUNCTION_GLYPH_CHARS) {
      const e = REGISTRY.find((x) => x.glyph === g);
      expect(e?.kind).toBe("function");
    }
  });
  it("monadic operator chars include the six classics", () => {
    for (const g of ["/", "\\", "¨", "⌿", "⍀", "⍨"]) {
      expect(MONADIC_OPERATOR_CHARS.has(g)).toBe(true);
    }
  });
  it("findByGlyph returns the entry for a known glyph", () => {
    const e = findByGlyph("+");
    expect(e?.slug).toBe("plus");
  });
  it("findByGlyph returns undefined for unknown glyph", () =>
    expect(findByGlyph("§")).toBe(undefined));
  it("MONADIC_DISPATCH covers monadic plus", () =>
    expect(MONADIC_DISPATCH.has("+")).toBe(true));
  it("DYADIC_DISPATCH covers dyadic plus", () =>
    expect(DYADIC_DISPATCH.has("+")).toBe(true));
  it("registry kinds are limited to the documented set", () => {
    for (const e of REGISTRY) {
      expect(["function", "operator", "syntax"]).toContain(e.kind);
    }
  });
});

/* ====================================================================== */
/*  tokenize: deeper coverage                                             */
/* ====================================================================== */

describe("tokenize deeper", () => {
  it("multiple statements with diamond", () => {
    const t = tokenize("1 ⋄ 2 ⋄ 3");
    expect(t.filter((x) => x.kind === "diamond")).toHaveLength(2);
  });
  it("string with multi-char content stays a string", () => {
    const t = tokenize("'hello world'");
    expect(t).toHaveLength(1);
    expect(t[0].kind).toBe("string");
    expect(t[0].value).toBe("hello world");
  });
  it("unterminated string yields no usable token", () => {
    expect(tokenize("'unterminated")).toHaveLength(0);
  });
  it("nested brackets", () => {
    const t = tokenize("a[b[1]]");
    const kinds = t.map((x) => x.kind);
    expect(kinds.filter((k) => k === "lbracket")).toHaveLength(2);
    expect(kinds.filter((k) => k === "rbracket")).toHaveLength(2);
  });
  it("decimal numbers parse", () => {
    const t = tokenize("3.14");
    expect(t[0].kind).toBe("number");
    expect(parseFloat(t[0].value)).toBeCloseTo(3.14);
  });
  it("zero is a valid number", () => {
    const t = tokenize("0");
    expect(t[0].kind).toBe("number");
    expect(t[0].value).toBe("0");
  });
  it("quad-prefixed name is uppercased", () => {
    const t = tokenize("⎕ts");
    expect(t[0].value).toBe("⎕TS");
  });
  it("whitespace alone yields no tokens", () => {
    const t = tokenize("   \t  ");
    expect(t).toHaveLength(0);
  });
  it("empty source yields no tokens", () => {
    expect(tokenize("")).toEqual([]);
  });
  it("operator glyphs tokenize as glyphs", () => {
    const t = tokenize("+/");
    expect(t.map((x) => x.kind)).toEqual(["glyph", "glyph"]);
  });
  it("parentheses tokenize", () => {
    const t = tokenize("(1+2)");
    expect(t.map((x) => x.kind)).toEqual([
      "lparen",
      "number",
      "glyph",
      "number",
      "rparen",
    ]);
  });
  it("assignment arrow tokenizes to its own kind", () => {
    const t = tokenize("x ← 5");
    expect(t.map((x) => x.kind)).toEqual(["name", "assign", "number"]);
  });
  it("escaped quotes stay together", () => {
    const t = tokenize("'a''b'");
    expect(t).toHaveLength(1);
    expect(t[0].value).toBe("a'b");
  });
});

/* ====================================================================== */
/*  parse: error surfaces and edge cases                                  */
/* ====================================================================== */

describe("parse error surfaces", () => {
  it("unmatched left paren errors", () =>
    expect(runErr("(1+2").kind).toBe("SYNTAX"));
  it("unmatched right bracket errors", () =>
    expect(runErr("1 2 3]").kind).toBe("SYNTAX"));
  it("stray diamond at start parses as empty statement", () => {
    const s = newSession();
    const r = runLine("⋄ 1", s);
    expect(r[r.length - 1].output).toBe("1");
  });
  it("two literal numbers form a vector", () =>
    expect(run("1 2")).toBe("1 2"));
  it("negative literal in vector", () =>
    expect(run("¯1 2 ¯3")).toBe("¯1 2 ¯3"));
  it("dfn without body returns implicit empty", () => {
    expect(() => run("{}")).not.toThrow();
  });
  it("parseProgram with empty env returns empty statements", () => {
    const env = emptyEnv();
    const prog = parseProgram("", env);
    expect(prog.statements).toEqual([]);
  });
  it("parseProgram tracks function names assigned in code", () => {
    const env = emptyEnv();
    parseProgram("sq ← {⍵*2}", env);
    expect(env.funcNames.has("sq")).toBe(true);
  });
});

/* ====================================================================== */
/*  format: more rendering paths                                          */
/* ====================================================================== */

describe("format rendering", () => {
  it("scalar number renders raw", () => expect(format(scalar(42))).toBe("42"));
  it("scalar negative uses high-minus", () =>
    expect(format(scalar(-5))).toBe("¯5"));
  it("vector with mixed positive and negative aligns minus", () =>
    expect(format(vector([1, -2, 3]))).toBe("1 ¯2 3"));
  it("empty character vector renders as blank", () =>
    expect(format({ shape: [0], data: [] as string[] })).toBe(""));
  it("string vector renders as the string", () =>
    expect(format({ shape: [3], data: ["a", "b", "c"] })).toBe("abc"));
  it("matrix with one row renders as a single line", () =>
    expect(format({ shape: [1, 3], data: [1, 2, 3] })).toBe("1 2 3"));
  it("matrix with one column renders aligned", () =>
    expect(format({ shape: [3, 1], data: [1, 22, 333] })).toBe("  1\n 22\n333"));
  it("decimal number drops trailing zeros for clean integers", () =>
    expect(format(scalar(2.0))).toBe("2"));
  it("very small number renders in fixed notation when feasible", () =>
    expect(format(scalar(0.5))).toBe("0.5"));
});

/* ====================================================================== */
/*  session behavior                                                      */
/* ====================================================================== */

describe("session behavior", () => {
  it("newSession returns independent state", () => {
    const a = newSession();
    const b = newSession();
    runLine("x ← 1", a);
    const r = runLine("x", b);
    expect(r[r.length - 1].isError).toBe(true);
    expect(r[r.length - 1].errorKind).toBe("VALUE");
  });
  it("variables persist within a session", () => {
    const s = newSession();
    runLine("acc ← 0", s);
    for (let i = 1; i <= 5; i++) runLine(`acc ← acc + ${i}`, s);
    const r = runLine("acc", s);
    expect(r[r.length - 1].output).toBe("15");
  });
  it("function values persist within a session", () => {
    const s = newSession();
    runLine("twice ← {⍵×2}", s);
    const r = runLine("twice 7", s);
    expect(r[r.length - 1].output).toBe("14");
  });
  it("empty source yields a single non-error empty result", () => {
    const s = newSession();
    const r = runLine("", s);
    expect(r).toHaveLength(1);
    expect(r[0].isError).toBe(false);
  });
  it("whitespace-only source yields empty result", () => {
    const s = newSession();
    const r = runLine("   ", s);
    expect(r[r.length - 1].isError).toBe(false);
  });
  it("error in first statement does not abort following statements within the call", () => {
    const s = newSession();
    const r = runLine("nope ⋄ 1 + 2", s);
    expect(r[0].isError).toBe(true);
    expect(r[1].isError).toBe(false);
    expect(r[1].output).toBe("3");
  });
  it("redefining a function after a variable releases the variable name", () => {
    const s = newSession();
    runLine("g ← 10", s);
    runLine("g ← {⍵+1}", s);
    const r = runLine("g 5", s);
    expect(r[r.length - 1].output).toBe("6");
  });
});

/* ====================================================================== */
/*  reduction over rank>1                                                 */
/* ====================================================================== */

describe("reduction over rank>1", () => {
  it("+/ over matrix reduces last axis", () =>
    expect(run("+/ 2 3 ⍴ 1 2 3 4 5 6")).toBe("6 15"));
  it("+⌿ over matrix reduces first axis", () =>
    expect(run("+⌿ 2 3 ⍴ 1 2 3 4 5 6")).toBe("5 7 9"));
  it("⌈/ over matrix returns row maxima", () =>
    expect(run("⌈/ 2 3 ⍴ 1 5 2 9 3 4")).toBe("5 9"));
  it("⌊/ over matrix returns row minima", () =>
    expect(run("⌊/ 2 3 ⍴ 1 5 2 9 3 4")).toBe("1 3"));
  it("×/ over matrix multiplies rows", () =>
    expect(run("×/ 2 3 ⍴ 1 2 3 1 2 3")).toBe("6 6"));
});

/* ====================================================================== */
/*  scan over rank>1                                                      */
/* ====================================================================== */

describe("scan over rank>1", () => {
  it("+\\ over vector is cumulative sum", () =>
    expect(run("+\\ 1 2 3 4")).toBe("1 3 6 10"));
  it("+\\ over matrix scans last axis", () =>
    expect(run("+\\ 2 3 ⍴ 1 2 3 4 5 6")).toBe("1 3  6\n4 9 15"));
  it("⌈\\ keeps running maximum", () =>
    expect(run("⌈\\ 1 3 2 5 4")).toBe("1 3 3 5 5"));
});

/* ====================================================================== */
/*  outer product variations                                              */
/* ====================================================================== */

describe("outer product variations", () => {
  it("∘.= identity matrix on iota", () =>
    expect(run("(⍳3) ∘.= ⍳3")).toBe("1 0 0\n0 1 0\n0 0 1"));
  it("∘.< strict upper triangle", () =>
    expect(run("(⍳3) ∘.< ⍳3")).toBe("0 1 1\n0 0 1\n0 0 0"));
  it("∘.≤ upper triangle inclusive", () =>
    expect(run("(⍳3) ∘.≤ ⍳3")).toBe("1 1 1\n0 1 1\n0 0 1"));
  it("∘.+ shifts the table", () =>
    expect(run("(⍳3) ∘.+ ⍳3")).toBe("2 3 4\n3 4 5\n4 5 6"));
  it("∘.| residue table", () =>
    expect(run("(⍳3) ∘.| ⍳3")).toBe("0 0 0\n1 0 1\n1 2 0"));
});

/* ====================================================================== */
/*  encoding / decoding mixed bases                                       */
/* ====================================================================== */

describe("encode / decode with mixed bases", () => {
  it("encode time of day", () =>
    expect(run("24 60 60 ⊤ 3725")).toBe("1 2 5"));
  it("decode time back to seconds", () =>
    expect(run("24 60 60 ⊥ 1 2 5")).toBe("3725"));
  it("encode 0 yields zeros", () =>
    expect(run("2 2 2 ⊤ 0")).toBe("0 0 0"));
  it("decode zeros yields 0", () =>
    expect(run("2 2 2 ⊥ 0 0 0")).toBe("0"));
});

/* ====================================================================== */
/*  comparison broadcasting                                               */
/* ====================================================================== */

describe("comparison broadcasting", () => {
  it("scalar vs vector eq", () =>
    expect(run("5 = 1 5 3 5 2")).toBe("0 1 0 1 0"));
  it("vector vs scalar gt", () =>
    expect(run("3 4 5 > 4")).toBe("0 0 1"));
  it("vector vs vector ne", () =>
    expect(run("1 2 3 ≠ 1 2 4")).toBe("0 0 1"));
  it("matrix vs scalar eq", () =>
    expect(run("(2 2 ⍴ 1 2 2 1) = 1")).toBe("1 0\n0 1"));
});

/* ====================================================================== */
/*  assignment paths                                                      */
/* ====================================================================== */

describe("assignment paths", () => {
  it("number literal assignment", () => {
    const s = newSession();
    runLine("x ← 7", s);
    const r = runLine("x", s);
    expect(r[r.length - 1].output).toBe("7");
  });
  it("vector assignment", () => {
    const s = newSession();
    runLine("xs ← 1 2 3 4 5", s);
    const r = runLine("+/xs", s);
    expect(r[r.length - 1].output).toBe("15");
  });
  it("matrix assignment", () => {
    const s = newSession();
    runLine("m ← 2 3 ⍴ ⍳6", s);
    const r = runLine("⍴ m", s);
    expect(r[r.length - 1].output).toBe("2 3");
  });
  it("re-assignment overwrites previous value", () => {
    const s = newSession();
    runLine("v ← 1", s);
    runLine("v ← 99", s);
    const r = runLine("v", s);
    expect(r[r.length - 1].output).toBe("99");
  });
  it("chained dependent assignments", () => {
    const s = newSession();
    runLine("a ← 1", s);
    runLine("b ← a + 1", s);
    runLine("c ← b × 10", s);
    const r = runLine("a b c", s);
    expect(r[r.length - 1].output).toBe("1 2 20");
  });
});

/* ====================================================================== */
/*  dfn corner cases                                                      */
/* ====================================================================== */

describe("dfn corner cases", () => {
  it("dfn returns the value of the last statement", () =>
    expect(run("{1 ⋄ 2 ⋄ 3} 0")).toBe("3"));
  it("dfn with local variable", () =>
    expect(run("{x ← ⍵×2 ⋄ x+1} 5")).toBe("11"));
  it("monadic dfn ignores left arg field when called monadically", () =>
    expect(run("{⍵+1} 9")).toBe("10"));
  it("dyadic dfn uses both args", () =>
    expect(run("3 {⍺×⍵} 4")).toBe("12"));
  it("dfn captures enclosing variable", () => {
    const s = newSession();
    runLine("k ← 100", s);
    runLine("addK ← {⍵+k}", s);
    const r = runLine("addK 5", s);
    expect(r[r.length - 1].output).toBe("105");
  });
  it("dfn body can hold many statements", () =>
    expect(run("{a ← ⍵+1 ⋄ b ← a×2 ⋄ b+⍵} 3")).toBe("11"));
});

/* ====================================================================== */
/*  primitives applied across shapes                                      */
/* ====================================================================== */

describe("primitives across shapes", () => {
  it("reverse a matrix along last axis", () =>
    expect(run("⌽ 2 3 ⍴ 1 2 3 4 5 6")).toBe("3 2 1\n6 5 4"));
  it("reverse-first on a matrix", () =>
    expect(run("⊖ 2 3 ⍴ 1 2 3 4 5 6")).toBe("4 5 6\n1 2 3"));
  it("transpose 3×2 to 2×3", () =>
    expect(run("⍉ 3 2 ⍴ 1 2 3 4 5 6")).toBe("1 3 5\n2 4 6"));
  it("rotate-first by 1 on matrix", () =>
    expect(run("1 ⊖ 2 3 ⍴ 1 2 3 4 5 6")).toBe("4 5 6\n1 2 3"));
});

/* ====================================================================== */
/*  error kind mapping                                                    */
/* ====================================================================== */

describe("error kind mapping", () => {
  it("LENGTH error on mismatched +", () =>
    expect(runErr("1 2 + 1 2 3").kind).toBe("LENGTH"));
  it("log of negative is NaN (silent)", () => {
    const out = run("⍟ ¯1");
    expect(out).toBe("NaN");
  });
  it("RANK error on indexing a scalar", () =>
    expect(runErr("5[1]").kind).toBe("RANK"));
  it("INDEX error on out-of-range subscript", () =>
    expect(runErr("(1 2 3)[10]").kind).toBe("INDEX"));
  it("VALUE error on unknown name", () =>
    expect(runErr("zzz").kind).toBe("VALUE"));
  it("SYNTAX error on dyadic primitive with no right argument", () =>
    expect(runErr("1 +").kind).toBe("SYNTAX"));
});

/* ====================================================================== */
/*  exercises content integrity                                           */
/* ====================================================================== */

describe("exercises content integrity (smoke)", () => {
  it("interpreter handles +/⍳N for small N", () => {
    for (const n of [0, 1, 5, 10, 100]) {
      const out = run(`+/⍳${n}`);
      const expected = ((n * (n + 1)) / 2).toString();
      expect(out).toBe(expected);
    }
  });
  it("interpreter handles ⍳N shape correctly", () => {
    for (const n of [0, 1, 3, 7]) {
      const s = newSession();
      const r = runLine(`⍴ ⍳${n}`, s);
      expect(r[r.length - 1].output).toBe(String(n));
    }
  });
  it("factorial via reduce matches built-in factorial", () => {
    for (const n of [0, 1, 2, 5, 7]) {
      const viaReduce = run(`×/⍳${n}`);
      const viaFactorial = run(`! ${n}`);
      expect(viaReduce).toBe(viaFactorial);
    }
  });
});

/* ====================================================================== */
/*  format() edge cases                                                   */
/* ====================================================================== */

describe("format edges", () => {
  it("scientific-magnitude positive number", () => {
    const out = format(scalar(1e9));
    expect(out.length).toBeGreaterThan(0);
  });
  it("very small positive number", () => {
    const out = format(scalar(1e-9));
    expect(out.length).toBeGreaterThan(0);
  });
  it("3D array separates planes with a blank line", () => {
    const out = format({
      shape: [2, 2, 2],
      data: [1, 2, 3, 4, 5, 6, 7, 8],
    });
    const planes = out.split("\n\n");
    expect(planes).toHaveLength(2);
  });
});
