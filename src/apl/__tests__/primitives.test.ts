import { describe, it, expect } from "vitest";
import { newSession, runLine } from "../index";

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

describe("scalar arithmetic", () => {
  it("addition", () => expect(run("2 + 3")).toBe("5"));
  it("subtraction", () => expect(run("10 - 4")).toBe("6"));
  it("multiplication", () => expect(run("3 × 4")).toBe("12"));
  it("division", () => expect(run("10 ÷ 4")).toBe("2.5"));
  it("power", () => expect(run("2 * 10")).toBe("1024"));
  it("negation monadic", () => expect(run("- 5")).toBe("¯5"));
  it("reciprocal monadic", () => expect(run("÷ 4")).toBe("0.25"));
  it("absolute monadic", () => expect(run("| ¯7")).toBe("7"));
  it("residue dyadic", () => expect(run("3 | 10")).toBe("1"));
  it("ceiling monadic", () => expect(run("⌈ 3.2")).toBe("4"));
  it("floor monadic", () => expect(run("⌊ 3.8")).toBe("3"));
  it("max dyadic", () => expect(run("5 ⌈ 7")).toBe("7"));
  it("min dyadic", () => expect(run("5 ⌊ 7")).toBe("5"));
  it("sign monadic", () => expect(run("× ¯3 0 4")).toBe("¯1 0 1"));
  it("factorial", () => expect(run("! 5")).toBe("120"));
  it("binomial", () => expect(run("2 ! 5")).toBe("10"));
  it("high-minus literal", () => expect(run("¯3 + 5")).toBe("2"));
});

describe("vector arithmetic", () => {
  it("vector + scalar", () => expect(run("1 2 3 + 10")).toBe("11 12 13"));
  it("scalar + vector", () => expect(run("10 + 1 2 3")).toBe("11 12 13"));
  it("vector + vector", () =>
    expect(run("1 2 3 + 10 20 30")).toBe("11 22 33"));
  it("length mismatch errors", () =>
    expect(runErr("1 2 + 3 4 5").kind).toBe("LENGTH"));
});

describe("comparison", () => {
  it("eq", () => expect(run("1 2 3 = 1 2 4")).toBe("1 1 0"));
  it("ne", () => expect(run("1 2 3 ≠ 1 2 4")).toBe("0 0 1"));
  it("lt", () => expect(run("3 < 5")).toBe("1"));
  it("le boundary", () => expect(run("5 ≤ 5")).toBe("1"));
  it("gt", () => expect(run("7 > 3")).toBe("1"));
  it("ge boundary", () => expect(run("5 ≥ 5")).toBe("1"));
});

describe("match / depth (≡)", () => {
  it("match equal vectors", () => expect(run("1 2 3 ≡ 1 2 3")).toBe("1"));
  it("match different values", () =>
    expect(run("1 2 3 ≡ 1 2 4")).toBe("0"));
  it("match shape mismatch", () =>
    expect(run("1 2 3 ≡ 1 2")).toBe("0"));
  it("match matrices", () =>
    expect(run("(2 2 ⍴ 1 2 3 4) ≡ 2 2 ⍴ 1 2 3 4")).toBe("1"));
  it("match scalar vs vector", () =>
    expect(run("5 ≡ ,5")).toBe("0"));
  it("match strings", () =>
    expect(run("'abc' ≡ 'abc'")).toBe("1"));
  it("depth of scalar is 0", () => expect(run("≡ 5")).toBe("0"));
  it("depth of flat vector is 1", () => expect(run("≡ 1 2 3")).toBe("1"));
  it("depth of string is 1", () => expect(run("≡ 'hello'")).toBe("1"));
  it("depth of empty vector is 1", () => expect(run("≡ ⍳0")).toBe("1"));
});

describe("not-match / tally (≢)", () => {
  it("not match different vectors", () =>
    expect(run("1 2 3 ≢ 1 2 4")).toBe("1"));
  it("not match equal vectors", () =>
    expect(run("1 2 3 ≢ 1 2 3")).toBe("0"));
  it("tally vector", () => expect(run("≢ 10 20 30 40 50")).toBe("5"));
  it("tally scalar is 1", () => expect(run("≢ 7")).toBe("1"));
  it("tally string is length", () =>
    expect(run("≢ 'workbench'")).toBe("9"));
  it("tally matrix is row count", () =>
    expect(run("≢ 3 4 ⍴ ⍳12")).toBe("3"));
  it("tally empty is zero", () => expect(run("≢ ⍳0")).toBe("0"));
});

describe("zilde (⍬)", () => {
  it("shape of zilde is 0", () => expect(run("⍴ ⍬")).toBe("0"));
  it("tally of zilde is 0", () => expect(run("≢ ⍬")).toBe("0"));
  it("zilde catenated with vector returns vector", () =>
    expect(run("⍬ , 1 2 3")).toBe("1 2 3"));
  it("vector catenated with zilde returns vector", () =>
    expect(run("1 2 3 , ⍬")).toBe("1 2 3"));
  it("sum of zilde works with identity", () =>
    expect(run("+/ ⍬")).toBe("0"));
});

describe("partition / nest (⊆)", () => {
  it("nest leaves simple scalar alone", () =>
    expect(run("⊆ 5")).toBe("5"));
  it("partition contiguous groups", () =>
    expect(run("≢ 1 1 2 2 0 3 3 ⊆ 'abcdefg'")).toBe("3"));
  it("partition drops zero entries", () =>
    expect(run("≢ 0 1 0 1 ⊆ 'abcd'")).toBe("2"));
  it("partition with all zeros yields empty", () =>
    expect(run("≢ 0 0 0 ⊆ 'abc'")).toBe("0"));
  it("partition errors on length mismatch", () =>
    expect(runErr("1 1 ⊆ 'abc'").kind).toBe("LENGTH"));
});

describe("power operator (⍣)", () => {
  it("apply N times", () => expect(run("{⍵+1}⍣5 ⊢ 0")).toBe("5"));
  it("apply zero times is identity", () =>
    expect(run("{⍵+1}⍣0 ⊢ 7")).toBe("7"));
  it("doubling thrice", () =>
    expect(run("{⍵×2}⍣3 ⊢ 1")).toBe("8"));
  it("dyadic carries left arg", () =>
    expect(run("2 {⍺+⍵}⍣4 ⊢ 0")).toBe("8"));
});

describe("rank operator (⍤)", () => {
  it("sum each row", () =>
    expect(run("+/⍤1 ⊢ 3 4 ⍴ ⍳12")).toBe("10 26 42"));
  it("product each row", () =>
    expect(run("×/⍤1 ⊢ 2 3 ⍴ 1 2 3 4 5 6")).toBe("6 120"));
  it("rank 0 cell is each-element", () =>
    expect(run("{⍵×2}⍤0 ⊢ 1 2 3 4")).toBe("2 4 6 8"));
});

describe("at operator (@)", () => {
  it("apply function at index", () =>
    expect(run("{0}@2 ⊢ 1 2 3 4 5")).toBe("1 0 3 4 5"));
  it("apply at multiple indices", () =>
    expect(run("{¯1}@(1 3 5) ⊢ 10 20 30 40 50")).toBe(
      "¯1 20 ¯1 40 ¯1"
    ));
  it("out-of-range index errors", () =>
    expect(runErr("{0}@10 ⊢ 1 2 3").kind).toBe("INDEX"));
});

describe("quote-quad (⍞)", () => {
  it("quote-quad reads as empty char vector", () =>
    expect(run("⍴ ⍞")).toBe("0"));
});

describe("logical", () => {
  it("and", () => expect(run("1 1 0 ∧ 1 0 0")).toBe("1 0 0"));
  it("or", () => expect(run("1 1 0 ∨ 0 0 0")).toBe("1 1 0"));
  it("not", () => expect(run("~ 1 0 1 0")).toBe("0 1 0 1"));
  it("nand", () => expect(run("1 1 0 ⍲ 1 0 0")).toBe("0 1 1"));
  it("nor", () => expect(run("0 0 1 ⍱ 0 1 0")).toBe("1 0 0"));
});

describe("structural", () => {
  it("iota", () => expect(run("⍳ 5")).toBe("1 2 3 4 5"));
  it("shape vec", () => expect(run("⍴ 1 2 3 4")).toBe("4"));
  it("reshape", () =>
    expect(run("3 4 ⍴ ⍳ 12")).toBe(
      "1  2  3  4\n5  6  7  8\n9 10 11 12"
    ));
  it("ravel", () => expect(run(", 2 2 ⍴ 1 2 3 4")).toBe("1 2 3 4"));
  it("catenate", () => expect(run("1 2 3 , 4 5")).toBe("1 2 3 4 5"));
  it("reverse last", () => expect(run("⌽ 1 2 3 4")).toBe("4 3 2 1"));
  it("rotate vec", () => expect(run("2 ⌽ 1 2 3 4 5")).toBe("3 4 5 1 2"));
  it("transpose 2x3", () =>
    expect(run("⍉ 2 3 ⍴ ⍳ 6")).toBe("1 4\n2 5\n3 6"));
  it("take positive", () => expect(run("3 ↑ 1 2 3 4 5")).toBe("1 2 3"));
  it("take negative", () => expect(run("¯3 ↑ 1 2 3 4 5")).toBe("3 4 5"));
  it("drop positive", () => expect(run("2 ↓ 1 2 3 4 5")).toBe("3 4 5"));
  it("drop negative", () => expect(run("¯2 ↓ 1 2 3 4 5")).toBe("1 2 3"));
});

describe("selection", () => {
  it("first", () => expect(run("⊃ 10 20 30")).toBe("10"));
  it("member", () =>
    expect(run("1 2 3 4 ∊ 2 4 6")).toBe("0 1 0 1"));
  it("unique", () => expect(run("∪ 1 2 2 3 1 4")).toBe("1 2 3 4"));
  it("union", () => expect(run("1 2 3 ∪ 3 4 5")).toBe("1 2 3 4 5"));
  it("intersect", () => expect(run("1 2 3 ∩ 2 3 4")).toBe("2 3"));
  it("where", () => expect(run("⍸ 0 1 0 1 1")).toBe("2 4 5"));
  it("find substring", () =>
    expect(run("⍸ 'ab' ⍷ 'cababd'")).toBe("2 4"));
  it("index of", () => expect(run("'abcde' ⍳ 'cae'")).toBe("3 1 5"));
  it("decode", () => expect(run("2 ⊥ 1 0 1 1")).toBe("11"));
  it("encode", () => expect(run("(8⍴2) ⊤ 11")).toBe("0 0 0 0 1 0 1 1"));
  it("grade up", () =>
    expect(run("⍋ 3 1 4 1 5 9 2 6")).toBe("2 4 7 1 3 5 8 6"));
  it("grade down", () =>
    expect(run("⍒ 3 1 4 1 5 9 2 6")).toBe("6 8 5 3 1 7 2 4"));
});

describe("operators", () => {
  it("reduce sum", () => expect(run("+/ 1 2 3 4 5")).toBe("15"));
  it("reduce product", () => expect(run("×/ 1 2 3 4 5")).toBe("120"));
  it("reduce on iota", () => expect(run("+/⍳10")).toBe("55"));
  it("scan sum", () => expect(run("+\\ 1 2 3 4 5")).toBe("1 3 6 10 15"));
  it("each", () => expect(run("{⍵*2}¨ 1 2 3 4")).toBe("1 4 9 16"));
  it("commute mo", () => expect(run("+⍨ 5")).toBe("10"));
  it("commute dy", () => expect(run("10 -⍨ 3")).toBe("¯7"));
  it("inner product", () => expect(run("1 2 3 +.× 4 5 6")).toBe("32"));
  it("outer product", () =>
    expect(run("1 2 3 ∘.× 1 2 3")).toBe(
      "1 2 3\n2 4 6\n3 6 9"
    ));
  it("reduce-first on matrix", () =>
    expect(run("+⌿ 3 2 ⍴ ⍳ 6")).toBe("9 12"));
});

describe("replicate / expand (dyadic / and \\)", () => {
  it("compress with boolean mask", () =>
    expect(run("1 0 1 0 1 / 1 2 3 4 5")).toBe("1 3 5"));
  it("replicate with counts", () =>
    expect(run("2 3 1 / 'abc'")).toBe("aabbbc"));
  it("filter via expression", () =>
    expect(run("(0=2|⍳10)/⍳10")).toBe("2 4 6 8 10"));
  it("expand with zeros", () =>
    expect(run("1 0 1 0 1 \\ 7 8 9")).toBe("7 0 8 0 9"));
});

describe("strings", () => {
  it("string vector", () => expect(run("'hello'")).toBe("hello"));
  it("char eq", () =>
    expect(run("'banana'='a'")).toBe("0 1 0 1 0 1"));
  it("count char", () => expect(run("+/'banana'='a'")).toBe("3"));
  it("reverse string", () => expect(run("⌽ 'abcd'")).toBe("dcba"));
});

describe("dfn / assignments", () => {
  it("dfn monadic", () => expect(run("{⍵*2} 5")).toBe("25"));
  it("dfn dyadic", () => expect(run("3 {⍺+⍵} 4")).toBe("7"));
  it("assignment then use", () =>
    expect(run("x ← 10 ⋄ x + 1")).toBe("11"));
  it("function assignment", () =>
    expect(run("sq ← {⍵*2} ⋄ sq 5")).toBe("25"));
  it("undefined name -> VALUE ERROR", () =>
    expect(runErr("nope + 1").kind).toBe("VALUE"));
});

describe("matrices", () => {
  it("matrix * vector inner product", () =>
    expect(run("(2 3 ⍴ 1 0 0 0 1 0) +.× 1 2 3")).toBe("1 2"));
  it("matrix multiply 2x3 * 3x2", () =>
    expect(run("(2 3 ⍴ ⍳ 6) +.× (3 2 ⍴ ⍳ 6)")).toBe(
      "22 28\n49 64"
    ));
  it("identity via outer eq", () =>
    expect(run("(⍳3) ∘.= ⍳3")).toBe("1 0 0\n0 1 0\n0 0 1"));
});

describe("system names", () => {
  it("⎕IO defaults to 1", () => expect(run("⎕IO")).toBe("1"));
  it("⎕A alphabet", () =>
    expect(run("⎕A")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
  it("⎕D digits", () => expect(run("⎕D")).toBe("0123456789"));
  it("⎕TS shape is 7", () => expect(run("⍴⎕TS")).toBe("7"));
  it("⎕A reversed", () =>
    expect(run("⌽⎕A")).toBe("ZYXWVUTSRQPONMLKJIHGFEDCBA"));
});

describe("execute (⍎)", () => {
  it("simple", () => expect(run("⍎ '1+2'")).toBe("3"));
  it("reduce", () => expect(run("⍎ '+/⍳10'")).toBe("55"));
  it("matrix", () =>
    expect(run("⍎ '3 3 ⍴ ⍳9'")).toBe(
      "1 2 3\n4 5 6\n7 8 9"
    ));
});

describe("multi-statement programs", () => {
  it("diamond chain", () =>
    expect(run("a ← 2 ⋄ b ← 3 ⋄ a + b")).toBe("5"));
  it("newline chain", () => {
    const s = newSession();
    runLine("x ← 5", s);
    const r = runLine("x * 2", s);
    expect(r[r.length - 1].output).toBe("25");
  });
  it("comment ignored", () =>
    expect(run("+/⍳10 ⍝ sum of first ten")).toBe("55"));
  it("tradfn wrapper", () =>
    expect(run("∇ inc ← {⍵+1} ∇\ninc 9")).toBe("10"));
});

describe("primesUpTo20", () => {
  it("sieve via outer product residue, +⌿ along first axis", () =>
    expect(run("(2=+⌿0=(⍳20)∘.|⍳20)/⍳20")).toBe(
      "2 3 5 7 11 13 17 19"
    ));
  it("dyadic / accepts a value left operand", () => {
    const out = run("(2=+/0=(⍳20)∘.|⍳20)/⍳20");
    expect(out.length).toBeGreaterThan(0);
  });
});
