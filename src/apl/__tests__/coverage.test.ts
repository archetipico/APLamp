import { describe, it, expect } from "vitest";
import { newSession, runLine } from "../index";
import { tokenize } from "../tokenize";
import { format } from "../format";
import {
  encloseMo,
  discloseMo,
  plusDy,
  divideDy,
  decodeDy,
  encodeDy,
  matInvMo,
  findDy,
  replicateDy,
  expandDy,
  formatMo,
  shapeMo,
  shapeDy,
  takeDy,
  dropDy,
  rotateLastDy,
  rotateFirstDy,
  transposeMo,
  reverseFirstMo,
  intersectDy,
  unionDy,
  uniqueMo,
  pickDy,
  binomialDy,
  factorialMo,
  circleDy,
  logDy,
  modDy,
  whereMo,
  gradeUpMo,
  gradeDownMo,
} from "../primitives";
import { isNested, scalar, vector, empty } from "../types";

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

const runValue = (src: string) => {
  const s = newSession();
  const r = runLine(src, s);
  const last = r[r.length - 1];
  if (last.isError) throw new Error(last.output);
  return last.value!;
};

/* ====================================================================== */
/*  Enclose / disclose                                                    */
/* ====================================================================== */

describe("enclose / disclose (regression: no JSON leakage)", () => {
  it("⊂ on scalar is identity", () => {
    const v = encloseMo(scalar(5));
    expect(v.shape).toEqual([]);
    expect(v.data[0]).toBe(5);
  });

  it("⊂ on vector produces nested scalar", () => {
    const v = encloseMo(vector([10, 20, 30]));
    expect(v.shape).toEqual([]);
    expect(v.data.length).toBe(1);
    const inner = v.data[0];
    expect(isNested(inner)).toBe(true);
    if (isNested(inner)) {
      expect(inner.shape).toEqual([3]);
      expect(inner.data).toEqual([10, 20, 30]);
    }
  });

  it("⊂ never produces JSON string in output", () => {
    const out = run("⊂ 10 20 30");
    expect(out).not.toContain("{");
    expect(out).not.toContain("shape");
    expect(out).not.toContain("data");
  });

  it("⊂ on vector renders boxed", () => {
    const out = run("⊂ 10 20 30");
    expect(out).toContain("10");
    expect(out).toContain("20");
    expect(out).toContain("30");
    expect(out).toMatch(/┌|│|└/);
  });

  it("⊃ unwraps a nested scalar back to the array", () => {
    const enc = encloseMo(vector([1, 2, 3]));
    const dis = discloseMo(enc);
    expect(dis.shape).toEqual([3]);
    expect(dis.data).toEqual([1, 2, 3]);
  });

  it("⊃ on empty returns scalar 0", () => {
    const d = discloseMo(empty());
    expect(d.shape).toEqual([]);
    expect(d.data).toEqual([0]);
  });

  it("⊃ on vector returns first element scalar", () => {
    expect(run("⊃ 7 8 9")).toBe("7");
  });

  it("⊃ ⊂ vector round-trips", () => {
    expect(run("⊃ ⊂ 1 2 3")).toBe("1 2 3");
  });
});

/* ====================================================================== */
/*  Arithmetic edge cases                                                 */
/* ====================================================================== */

describe("arithmetic edge cases", () => {
  it("divide 0 by 0 is 1 (APL convention)", () =>
    expect(run("0 ÷ 0")).toBe("1"));

  it("divide by zero errors", () =>
    expect(runErr("1 ÷ 0").kind).toBe("DOMAIN"));

  it("reciprocal of zero errors", () =>
    expect(runErr("÷ 0").kind).toBe("DOMAIN"));

  it("residue with 0 modulus returns right operand", () => {
    const r = modDy(scalar(0), scalar(7));
    expect(r.data[0]).toBe(7);
  });

  it("residue handles negative left operand", () => {
    const r = modDy(scalar(3), scalar(-1));
    expect(r.data[0]).toBe(2);
  });

  it("power: e^0 = 1", () => expect(run("* 0")).toBe("1"));

  it("natural log of e is 1", () => {
    const r = logDy(scalar(Math.E), scalar(Math.E * Math.E));
    expect(r.data[0]).toBeCloseTo(2);
  });

  it("factorial 0 is 1", () => expect(run("! 0")).toBe("1"));

  it("factorial of negative errors", () => {
    expect(() => factorialMo(scalar(-1))).toThrow();
  });

  it("binomial out of range yields 0", () => {
    const r = binomialDy(scalar(5), scalar(3));
    expect(r.data[0]).toBe(0);
  });

  it("binomial 0! cases", () => expect(run("0 ! 5")).toBe("1"));

  it("scalar plus broadcasts over matrix", () =>
    expect(run("10 + 2 2 ⍴ 1 2 3 4")).toBe("11 12\n13 14"));

  it("matrix plus matrix elementwise", () =>
    expect(run("(2 2 ⍴ 1 2 3 4) + 2 2 ⍴ 10 20 30 40")).toBe(
      "11 22\n33 44"
    ));

  it("rounding ceiling on negative", () =>
    expect(run("⌈ ¯3.2")).toBe("¯3"));

  it("floor on negative", () => expect(run("⌊ ¯3.2")).toBe("¯4"));

  it("plus identity on rank-0", () => {
    const r = plusDy(scalar(2), scalar(3));
    expect(r.shape).toEqual([]);
  });

  it("divide returns shape of vector argument", () => {
    const r = divideDy(scalar(10), vector([2, 5]));
    expect(r.shape).toEqual([2]);
    expect(r.data).toEqual([5, 2]);
  });
});

/* ====================================================================== */
/*  Circular functions (○)                                                */
/* ====================================================================== */

describe("circle dyadic ○", () => {
  it("sin 0 = 0", () => {
    expect(circleDy(scalar(1), scalar(0)).data[0]).toBeCloseTo(0);
  });
  it("cos 0 = 1", () => {
    expect(circleDy(scalar(2), scalar(0)).data[0]).toBeCloseTo(1);
  });
  it("tan 0 = 0", () => {
    expect(circleDy(scalar(3), scalar(0)).data[0]).toBeCloseTo(0);
  });
  it("asin 1 = pi/2", () => {
    expect(circleDy(scalar(-1), scalar(1)).data[0]).toBeCloseTo(Math.PI / 2);
  });
  it("0 ○ x = sqrt(1-x^2)", () => {
    expect(circleDy(scalar(0), scalar(0)).data[0]).toBeCloseTo(1);
  });
  it("sinh 0 = 0", () => {
    expect(circleDy(scalar(5), scalar(0)).data[0]).toBeCloseTo(0);
  });
  it("cosh 0 = 1", () => {
    expect(circleDy(scalar(6), scalar(0)).data[0]).toBeCloseTo(1);
  });
  it("tanh 0 = 0", () => {
    expect(circleDy(scalar(7), scalar(0)).data[0]).toBeCloseTo(0);
  });
  it("unsupported variant throws", () => {
    expect(() => circleDy(scalar(99), scalar(1))).toThrow();
  });
});

/* ====================================================================== */
/*  Comparison / logical                                                  */
/* ====================================================================== */

describe("comparison edges", () => {
  it("≠ on strings", () =>
    expect(run("'abc' ≠ 'abd'")).toBe("0 0 1"));

  it("string equality with high-tolerance numeric short-circuit", () =>
    expect(run("'x' = 'x'")).toBe("1"));

  it("≥ with non-equal numbers", () => expect(run("3 ≥ 5")).toBe("0"));

  it("≤ with not-equal", () => expect(run("3 ≤ 5")).toBe("1"));
});

describe("logical errors", () => {
  it("∧ with non-boolean", () => {
    expect(runErr("2 ∧ 1").kind).toBe("DOMAIN");
  });
  it("∨ with non-boolean", () => {
    expect(runErr("0 ∨ 7").kind).toBe("DOMAIN");
  });
  it("~ of non-boolean", () => {
    expect(runErr("~ 5").kind).toBe("DOMAIN");
  });
});

/* ====================================================================== */
/*  Structural                                                            */
/* ====================================================================== */

describe("structural edges", () => {
  it("shape of scalar is empty vector", () => {
    const r = shapeMo(scalar(3));
    expect(r.shape).toEqual([0]);
    expect(r.data).toEqual([]);
  });

  it("shape of 2D matrix", () => {
    const m = { shape: [3, 2], data: [1, 2, 3, 4, 5, 6] };
    const r = shapeMo(m);
    expect(r.data).toEqual([3, 2]);
  });

  it("reshape into 3D", () => {
    expect(run("2 2 2 ⍴ ⍳ 8")).toBe("1 2\n3 4\n\n5 6\n7 8");
  });

  it("reshape empty into 0-shape", () => {
    const r = shapeDy(vector([0, 3]), vector([1, 2, 3]));
    expect(r.shape).toEqual([0, 3]);
    expect(r.data).toEqual([]);
  });

  it("reshape errors on empty source into non-empty target", () => {
    expect(() => shapeDy(scalar(3), empty())).toThrow();
  });

  it("reshape errors on negative dimension", () => {
    expect(() => shapeDy(scalar(-3), vector([1, 2, 3]))).toThrow();
  });

  it("ravel of matrix flattens", () => {
    expect(run(", 2 2 ⍴ 1 2 3 4")).toBe("1 2 3 4");
  });

  it("catenate scalar to vector", () => {
    expect(run("0 , 1 2 3")).toBe("0 1 2 3");
  });

  it("catenate two matrices along last axis", () => {
    expect(run("(2 2 ⍴ 1 2 3 4) , 2 2 ⍴ 5 6 7 8")).toBe(
      "1 2 5 6\n3 4 7 8"
    );
  });

  it("catenate matrices with row mismatch errors", () => {
    expect(() =>
      runLineGrab("(2 2 ⍴ 1 2 3 4) , 3 2 ⍴ ⍳ 6")
    ).toBeTruthy();
  });

  it("reverse-first on matrix", () => {
    const m = { shape: [2, 2], data: [1, 2, 3, 4] };
    const r = reverseFirstMo(m);
    expect(r.shape).toEqual([2, 2]);
    expect(r.data).toEqual([3, 4, 1, 2]);
  });

  it("rotate scalar is identity", () => {
    const r = rotateLastDy(scalar(2), scalar(9));
    expect(r.data).toEqual([9]);
  });

  it("rotate negative wraps backward", () => {
    expect(run("¯1 ⌽ 1 2 3 4")).toBe("4 1 2 3");
  });

  it("rotate-first on matrix", () => {
    const r = rotateFirstDy(scalar(1), {
      shape: [2, 2],
      data: [1, 2, 3, 4],
    });
    expect(r.data).toEqual([3, 4, 1, 2]);
  });

  it("transpose rank>2 errors", () => {
    const m = { shape: [2, 2, 2], data: [1, 2, 3, 4, 5, 6, 7, 8] };
    expect(() => transposeMo(m)).toThrow();
  });

  it("transpose of scalar is itself", () => {
    const r = transposeMo(scalar(5));
    expect(r.data).toEqual([5]);
  });

  it("take with fill (numeric)", () => {
    const r = takeDy(scalar(5), vector([1, 2]));
    expect(r.data).toEqual([1, 2, 0, 0, 0]);
  });

  it("take with fill (character)", () => {
    expect(run("5 ↑ 'ab'")).toBe("ab   ");
  });

  it("take 0 yields empty", () => {
    const r = takeDy(scalar(0), vector([1, 2, 3]));
    expect(r.shape).toEqual([0]);
  });

  it("drop more than length yields empty", () => {
    const r = dropDy(scalar(10), vector([1, 2, 3]));
    expect(r.shape).toEqual([0]);
  });
});

/* ====================================================================== */
/*  Iota / index / member                                                 */
/* ====================================================================== */

describe("iota and index-of", () => {
  it("⍳ 0 yields empty", () => {
    const r = runValue("⍳ 0") as { shape: number[]; data: unknown[] };
    expect(r.shape).toEqual([0]);
    expect(r.data).toEqual([]);
  });

  it("⍳ negative errors", () =>
    expect(runErr("⍳ ¯3").kind).toBe("DOMAIN"));

  it("⍳ on rank-2 errors", () =>
    expect(runErr("⍳ 2 2 ⍴ 1 2 3 4").kind).toBe("RANK"));

  it("dyadic ⍳: not-found returns length+1", () =>
    expect(run("1 2 3 ⍳ 9")).toBe("4"));
});

/* ====================================================================== */
/*  Pick, decode, encode                                                  */
/* ====================================================================== */

describe("pick (⌷), decode (⊥), encode (⊤)", () => {
  it("pick first element of vector", () => {
    expect(run("1 ⌷ 10 20 30")).toBe("10");
  });

  it("pick out of range errors", () => {
    expect(() => pickDy(scalar(5), vector([1, 2, 3]))).toThrow();
  });

  it("pick from matrix selects row", () => {
    const r = pickDy(scalar(1), { shape: [2, 3], data: [1, 2, 3, 4, 5, 6] });
    expect(r.shape).toEqual([3]);
    expect(r.data).toEqual([1, 2, 3]);
  });

  it("decode binary", () => {
    expect(decodeDy(scalar(2), vector([1, 0, 1])).data[0]).toBe(5);
  });

  it("decode with mixed bases", () => {
    expect(decodeDy(vector([24, 60, 60]), vector([1, 2, 30])).data[0]).toBe(
      3750
    );
  });

  it("encode round-trips with binary decode", () => {
    const enc = encodeDy(vector([2, 2, 2, 2]), scalar(11));
    expect(enc.data).toEqual([1, 0, 1, 1]);
  });

  it("encode with zero base captures remainder", () => {
    const enc = encodeDy(vector([0, 10, 10]), scalar(123));
    expect(enc.data).toEqual([1, 2, 3]);
  });
});

/* ====================================================================== */
/*  Membership, set ops                                                   */
/* ====================================================================== */

describe("set operations on strings", () => {
  it("unique on chars", () =>
    expect(run("∪ 'banana'")).toBe("ban"));

  it("intersect chars", () => {
    const r = intersectDy(
      { shape: [3], data: ["a", "b", "c"] },
      { shape: [3], data: ["b", "c", "d"] }
    );
    expect(r.data).toEqual(["b", "c"]);
  });

  it("union chars", () => {
    const r = unionDy(
      { shape: [2], data: ["a", "b"] },
      { shape: [2], data: ["b", "c"] }
    );
    expect(r.data).toEqual(["a", "b", "c"]);
  });

  it("∊ all hits", () => expect(run("1 2 3 ∊ 1 2 3 4")).toBe("1 1 1"));

  it("∊ all misses", () =>
    expect(run("9 8 7 ∊ 1 2 3")).toBe("0 0 0"));

  it("unique on rank>1 errors", () => {
    const m = { shape: [2, 2], data: [1, 2, 3, 4] };
    expect(() => uniqueMo(m)).toThrow();
  });
});

/* ====================================================================== */
/*  Where / Find / Grade                                                  */
/* ====================================================================== */

describe("where / find / grade", () => {
  it("where on all-zero is empty", () => {
    const r = whereMo(vector([0, 0, 0]));
    expect(r.shape).toEqual([0]);
  });

  it("where rejects non-boolean", () => {
    expect(() => whereMo(vector([0, 2, 1]))).toThrow();
  });

  it("find with no match is all zero", () => {
    const r = findDy(vector(["x"]), vector(["a", "b", "c"]));
    expect(r.data).toEqual([0, 0, 0]);
  });

  it("find vector longer than haystack returns all zeros", () => {
    const r = findDy(
      vector([1, 2, 3, 4]),
      vector([1, 2])
    );
    expect(r.data).toEqual([0, 0]);
  });

  it("grade up on vector with ties is stable", () => {
    const r = gradeUpMo(vector([2, 1, 2, 1]));
    expect(r.data).toEqual([2, 4, 1, 3]);
  });

  it("grade down on rank>1 errors", () => {
    const m = { shape: [2, 2], data: [1, 2, 3, 4] };
    expect(() => gradeDownMo(m)).toThrow();
  });

  it("grade up on chars uses lexicographic", () => {
    const r = gradeUpMo({ shape: [3], data: ["c", "a", "b"] });
    expect(r.data).toEqual([2, 3, 1]);
  });
});

/* ====================================================================== */
/*  Replicate / Expand                                                    */
/* ====================================================================== */

describe("replicate / expand edges", () => {
  it("replicate with negative count produces fills", () => {
    const r = replicateDy(vector([1, -2, 1]), vector([10, 20, 30]));
    expect(r.data).toEqual([10, 0, 0, 30]);
  });

  it("replicate scalar count broadcasts", () => {
    const r = replicateDy(scalar(2), vector([1, 2, 3]));
    expect(r.data).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("replicate length mismatch errors", () => {
    expect(() =>
      replicateDy(vector([1, 0]), vector([1, 2, 3]))
    ).toThrow();
  });

  it("expand boolean: too few values errors", () => {
    expect(() => expandDy(vector([1, 1, 1]), vector([1]))).toThrow();
  });

  it("expand boolean: extra values errors", () => {
    expect(() =>
      expandDy(vector([1, 0]), vector([1, 2, 3]))
    ).toThrow();
  });

  it("expand boolean: non-binary mask errors", () => {
    expect(() => expandDy(vector([2]), vector([1]))).toThrow();
  });
});

/* ====================================================================== */
/*  Matrix inversion                                                      */
/* ====================================================================== */

describe("matrix inversion (⌹)", () => {
  it("reciprocal of scalar", () => {
    const r = matInvMo(scalar(4));
    expect(r.data[0]).toBe(0.25);
  });

  it("inverse of 2x2", () => {
    const r = matInvMo({ shape: [2, 2], data: [4, 7, 2, 6] });
    expect(r.shape).toEqual([2, 2]);
    expect(r.data[0]).toBeCloseTo(0.6);
  });

  it("singular matrix errors", () => {
    expect(() =>
      matInvMo({ shape: [2, 2], data: [1, 2, 2, 4] })
    ).toThrow();
  });

  it("3x3 errors (not supported)", () => {
    expect(() =>
      matInvMo({ shape: [3, 3], data: [1, 0, 0, 0, 1, 0, 0, 0, 1] })
    ).toThrow();
  });
});

/* ====================================================================== */
/*  Format function ⍕                                                     */
/* ====================================================================== */

describe("formatMo (⍕)", () => {
  it("renders number as chars", () => {
    const r = formatMo(scalar(42));
    expect(r.shape).toEqual([2]);
    expect(r.data).toEqual(["4", "2"]);
  });

  it("renders negative with high-minus", () => {
    const r = formatMo(scalar(-3));
    expect(r.data.join("")).toBe("¯3");
  });

  it("formats vector joined by spaces", () => {
    const r = formatMo(vector([1, 2, 3]));
    expect(r.data.join("")).toBe("1 2 3");
  });
});

/* ====================================================================== */
/*  format() display                                                      */
/* ====================================================================== */

describe("format() display", () => {
  it("NaN prints", () => {
    expect(format(scalar(NaN))).toBe("NaN");
  });

  it("Infinity prints as ∞", () => {
    expect(format(scalar(Infinity))).toBe("∞");
  });

  it("negative infinity prints as ¯∞", () => {
    expect(format(scalar(-Infinity))).toBe("¯∞");
  });

  it("negative zero renders as 0", () => {
    expect(format(scalar(-0))).toBe("0");
  });

  it("empty vector renders blank", () => {
    expect(format(empty())).toBe("");
  });

  it("char scalar renders bare", () => {
    expect(format(scalar("x"))).toBe("x");
  });

  it("matrix right-aligns columns", () => {
    expect(
      format({
        shape: [2, 2],
        data: [1, 100, 2, 3],
      })
    ).toBe("1 100\n2   3");
  });

  it("char matrix has no inter-column space", () => {
    expect(
      format({
        shape: [2, 2],
        data: ["a", "b", "c", "d"],
      })
    ).toBe("ab\ncd");
  });

  it("rank-3 separates planes with blank line", () => {
    const out = format({
      shape: [2, 2, 2],
      data: [1, 2, 3, 4, 5, 6, 7, 8],
    });
    expect(out).toBe("1 2\n3 4\n\n5 6\n7 8");
  });

  it("boxed nested scalar renders top/bottom borders", () => {
    const nested = encloseMo(vector([1, 2, 3]));
    const out = format(nested);
    expect(out.split("\n")[0]).toMatch(/^┌/);
    expect(out.split("\n").slice(-1)[0]).toMatch(/^└/);
  });
});

/* ====================================================================== */
/*  Tokenizer                                                             */
/* ====================================================================== */

describe("tokenize", () => {
  it("tokenizes simple expression", () => {
    const t = tokenize("1 + 2");
    expect(t.map((x) => x.kind)).toEqual(["number", "glyph", "number"]);
  });

  it("comment is dropped", () => {
    const t = tokenize("1 ⍝ comment\n2");
    expect(t.map((x) => x.value)).toEqual(["1", "\n", "2"]);
  });

  it("string with doubled single quote is unescaped", () => {
    const t = tokenize("'it''s'");
    expect(t).toHaveLength(1);
    expect(t[0].value).toBe("it's");
  });

  it("high-minus produces negative number", () => {
    const t = tokenize("¯3.5");
    expect(t[0].kind).toBe("number");
    expect(parseFloat(t[0].value)).toBe(-3.5);
  });

  it("scientific notation", () => {
    const t = tokenize("1.5e3");
    expect(parseFloat(t[0].value)).toBe(1500);
  });

  it("scientific with high-minus exponent", () => {
    const t = tokenize("1e¯2");
    expect(parseFloat(t[0].value)).toBe(0.01);
  });

  it("quad-name lowercase becomes upper", () => {
    const t = tokenize("⎕io");
    expect(t[0].value).toBe("⎕IO");
  });

  it("plain quad without suffix", () => {
    const t = tokenize("⎕");
    expect(t[0].kind).toBe("name");
    expect(t[0].value).toBe("⎕");
  });

  it("special names ⍵ ⍺", () => {
    const t = tokenize("⍺ ⍵");
    expect(t.map((x) => x.value)).toEqual(["⍺", "⍵"]);
  });

  it("braces are glyphs", () => {
    const t = tokenize("{}");
    expect(t.map((x) => x.kind)).toEqual(["glyph", "glyph"]);
  });

  it("unknown character throws", () => {
    expect(() => tokenize("§")).toThrow(/SYNTAX/);
  });

  it("brackets and semicolon", () => {
    const t = tokenize("a[1;2]");
    expect(t.map((x) => x.kind)).toEqual([
      "name",
      "lbracket",
      "number",
      "semicolon",
      "number",
      "rbracket",
    ]);
  });

  it("diamond separator", () => {
    const t = tokenize("a ⋄ b");
    expect(t[1].kind).toBe("diamond");
  });
});

/* ====================================================================== */
/*  Parser / evaluation control                                           */
/* ====================================================================== */

describe("parser and statement control", () => {
  it("multiple diamond statements run in order", () => {
    const s = newSession();
    const r = runLine("x ← 1 ⋄ y ← 2 ⋄ x + y", s);
    expect(r[r.length - 1].output).toBe("3");
  });

  it("newline-separated statements", () => {
    const s = newSession();
    const r = runLine("a ← 10\nb ← 20\na + b", s);
    expect(r[r.length - 1].output).toBe("30");
  });

  it("assignment produces no output", () => {
    const s = newSession();
    const r = runLine("z ← 7", s);
    expect(r[r.length - 1].output).toBe("");
    expect(r[r.length - 1].isError).toBe(false);
  });

  it("indexing single dimension", () =>
    expect(run("(1 2 3 4 5)[3]")).toBe("3"));

  it("indexing with vector of indices", () =>
    expect(run("(10 20 30 40 50)[2 4]")).toBe("20 40"));

  it("indexing 2D with both axes specified", () =>
    expect(run("(2 3 ⍴ ⍳ 6)[1;2]")).toBe("2"));

  it("indexing 2D with empty first axis selects column", () =>
    expect(run("(2 3 ⍴ ⍳ 6)[;1]")).toBe("1\n4"));

  it("indexing out of range errors", () =>
    expect(runErr("(1 2 3)[9]").kind).toBe("INDEX"));

  it("indexing a scalar errors", () =>
    expect(runErr("5[1]").kind).toBe("RANK"));

  it("parens around expression", () =>
    expect(run("(2 + 3) × 4")).toBe("20"));

  it("nested dfn captures outer env", () => {
    const s = newSession();
    runLine("x ← 10", s);
    runLine("f ← {x + ⍵}", s);
    const r = runLine("f 5", s);
    expect(r[r.length - 1].output).toBe("15");
  });

  it("dfn with multiple statements returns last value", () =>
    expect(run("{a ← ⍵ + 1 ⋄ a × 2} 3")).toBe("8"));

  it("missing function in dyadic position errors", () =>
    expect(runErr("1 nope 2").kind).toBe("VALUE"));

  it("trailing function without right arg errors", () =>
    expect(runErr("1 +").kind).toBe("SYNTAX"));

  it("dfn applied as right argument of dyadic errors", () =>
    expect(runErr("1 + {⍵+1}").kind).toBe("SYNTAX"));

  it("paren function in value position errors", () =>
    expect(runErr("(+)").kind).toBe("SYNTAX"));

  it("function-as-index errors", () =>
    expect(runErr("(1 2 3)[+]").kind).toBe("SYNTAX"));

  it("tradfn definition then use", () => {
    const s = newSession();
    const r1 = runLine("∇ inc ← {⍵+1} ∇", s);
    expect(r1[r1.length - 1].isError).toBe(false);
    const r2 = runLine("inc 41", s);
    expect(r2[r2.length - 1].output).toBe("42");
  });

  it("comment line on its own", () =>
    expect(run("⍝ just a comment\n1 + 1")).toBe("2"));

  it("re-assigning a function name to a value clears function status", () => {
    const s = newSession();
    runLine("foo ← {⍵+1}", s);
    runLine("foo ← 99", s);
    const r = runLine("foo", s);
    expect(r[r.length - 1].output).toBe("99");
  });
});

/* ====================================================================== */
/*  Quad system names                                                     */
/* ====================================================================== */

describe("quad system names", () => {
  it("⎕AV first character is space", () => {
    const v = runValue("⎕AV") as { data: unknown[] };
    expect(v.data[0]).toBe(" ");
  });

  it("⎕AV length is 95", () =>
    expect(run("⍴ ⎕AV")).toBe("95"));

  it("unknown quad throws VALUE", () =>
    expect(runErr("⎕NOPE").kind).toBe("VALUE"));
});

/* ====================================================================== */
/*  Operators (composite)                                                 */
/* ====================================================================== */

describe("operators edge cases", () => {
  it("reduce over empty uses identity element (sum=0)", () => {
    const r = runValue("+/ ⍳ 0") as { data: unknown[] };
    expect(r.data[0]).toBe(0);
  });

  it("reduce-product over empty = 1", () => {
    const r = runValue("×/ ⍳ 0") as { data: unknown[] };
    expect(r.data[0]).toBe(1);
  });

  it("reduce-max over empty = -∞", () => {
    const r = runValue("⌈/ ⍳ 0") as { data: unknown[] };
    expect(r.data[0]).toBe(-Infinity);
  });

  it("reduce on scalar is the scalar", () =>
    expect(run("+/ 5")).toBe("5"));

  it("each on dyadic with two vectors", () =>
    expect(run("1 2 3 +¨ 10 20 30")).toBe("11 22 33"));

  it("each on scalar-left dyadic", () =>
    expect(run("10 +¨ 1 2 3")).toBe("11 12 13"));

  it("each shape mismatch errors", () =>
    expect(runErr("1 2 +¨ 3 4 5").kind).toBe("LENGTH"));

  it("commute dyadic swaps args", () =>
    expect(run("3 -⍨ 10")).toBe("7"));

  it("outer product with chars", () =>
    expect(run("'ab' ∘.= 'aba'")).toBe(
      "1 0 1\n0 1 0"
    ));

  it("inner product matrix * vector", () =>
    expect(run("(2 2 ⍴ 1 2 3 4) +.× 10 100")).toBe(
      "210 430"
    ));

  it("inner product vector * matrix", () =>
    expect(run("10 100 +.× 2 2 ⍴ 1 2 3 4")).toBe(
      "310 420"
    ));

  it("inner-product mismatched length errors", () =>
    expect(runErr("1 2 +.× 1 2 3").kind).toBe("LENGTH"));

  it("n-wise reduce throws NONCE", () =>
    expect(runErr("2 +/ 1 2 3 4").kind).toBe("NONCE"));

  it("derived2 monadic position errors (inner product)", () =>
    expect(runErr("+.× 1 2 3").kind).toBe("DOMAIN"));
});

/* ====================================================================== */
/*  Strings                                                               */
/* ====================================================================== */

describe("strings", () => {
  it("single char is scalar", () => {
    const v = runValue("'a'") as { shape: number[] };
    expect(v.shape).toEqual([]);
  });

  it("doubled-quote escape", () =>
    expect(run("'don''t'")).toBe("don't"));

  it("char concatenation", () =>
    expect(run("'ab' , 'cd'")).toBe("abcd"));

  it("char vector iota lookup", () =>
    expect(run("'abc' ⍳ 'b'")).toBe("2"));
});

/* ====================================================================== */
/*  Multi-result programs                                                 */
/* ====================================================================== */

describe("multi-result programs", () => {
  it("session persists assignments across runLine calls", () => {
    const s = newSession();
    runLine("acc ← 0", s);
    runLine("acc ← acc + 5", s);
    runLine("acc ← acc + 6", s);
    const r = runLine("acc", s);
    expect(r[r.length - 1].output).toBe("11");
  });

  it("multiple statements per call return one result per statement", () => {
    const s = newSession();
    const r = runLine("1 + 1 ⋄ 2 × 3 ⋄ 4 - 1", s);
    expect(r.map((x) => x.output)).toEqual(["2", "6", "3"]);
  });

  it("error in one statement does not poison the next session call", () => {
    const s = newSession();
    runLine("nope + 1", s);
    const r = runLine("1 + 1", s);
    expect(r[r.length - 1].output).toBe("2");
  });
});

/* ====================================================================== */
/*  Plus on rank-0 / fillOf branch                                        */
/* ====================================================================== */

describe("fill behavior", () => {
  it("over-take pads char vector with spaces", () =>
    expect(run("4 ↑ 'ab'")).toBe("ab  "));

  it("over-take pads numeric with zeros", () => {
    const r = takeDy(scalar(4), vector([1, 2]));
    expect(r.data).toEqual([1, 2, 0, 0]);
  });
});

/* ====================================================================== */
/*  Tack left / right                                                     */
/* ====================================================================== */

describe("tack left / right (⊣ ⊢)", () => {
  it("monadic ⊣ is identity (cleaned up)", () =>
    expect(run("⊣ 1 2 3")).toBe("1 2 3"));

  it("monadic ⊢ is identity", () =>
    expect(run("⊢ 1 2 3")).toBe("1 2 3"));

  it("dyadic ⊣ returns left", () =>
    expect(run("1 2 3 ⊣ 9 9 9")).toBe("1 2 3"));

  it("dyadic ⊢ returns right", () =>
    expect(run("1 2 3 ⊢ 9 9 9")).toBe("9 9 9"));

  it("⊣ on nested scalar preserves it", () => {
    const enc = encloseMo(vector([1, 2, 3]));
    expect(isNested(enc.data[0])).toBe(true);
  });
});

/* ====================================================================== */
/*  formatMo on nested                                                    */
/* ====================================================================== */

describe("⍕ on nested arrays", () => {
  it("renders nested vector elements space-joined, not JSON", () => {
    const enc = encloseMo(vector([1, 2, 3]));
    const r = formatMo(enc);
    expect(r.data.join("")).toBe("1 2 3");
    expect(r.data.join("")).not.toContain("{");
  });

  it("renders nested negative numbers with high-minus", () => {
    const enc = encloseMo(vector([-1, 2, -3]));
    const r = formatMo(enc);
    expect(r.data.join("")).toBe("¯1 2 ¯3");
  });
});

/* helper to grab errors from runLine for catenate test above */
function runLineGrab(src: string): string {
  const s = newSession();
  const r = runLine(src, s);
  const last = r[r.length - 1];
  if (last.isError) return last.output;
  return "";
}
