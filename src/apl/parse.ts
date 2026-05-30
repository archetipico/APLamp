import type { Token } from "./tokenize";
import { tokenize } from "./tokenize";
import type { AnyNode, FuncNode, Program, ValueNode } from "./ast";
import { isFuncNode } from "./ast";
import { SYNTAX_ERROR } from "./types";
import { FUNCTION_GLYPH_CHARS, MONADIC_OPERATOR_CHARS } from "./registry";

const VALUE_NAMES = new Set(["⍵", "⍺", "⎕", "⍬", "⍞"]);

/**
 * Glyphs that are operators in suffix position (e.g. f/, f\) but become
 * dyadic primitive functions when they appear right after a value
 * (replicate/compress for / ⌿, expand for \ ⍀). Kept out of
 * FUNCTION_GLYPH_CHARS so parseFunc's operator-suffix loop does not
 * consume them as primitive functions.
 */
const DYADIC_OPERATOR_PRIMS = new Set(["/", "\\", "⌿", "⍀"]);

/** Operators that take a function on the left and either a function or
 * a value on the right (single atom). */
const DYADIC_VAL_OPERATORS = new Set(["⍣", "⍤", "@"]);

/**
 * Parser environment: names that are known to be functions.
 * Built incrementally by the REPL as the user assigns function aliases.
 */
export interface ParseEnv {
  funcNames: Set<string>;
}

export const emptyEnv = (): ParseEnv => ({ funcNames: new Set() });

class Cursor {
  i = 0;
  constructor(public toks: Token[]) {}
  peek(off = 0): Token | undefined {
    return this.toks[this.i + off];
  }
  next(): Token {
    return this.toks[this.i++];
  }
  done(): boolean {
    return this.i >= this.toks.length;
  }
  expect(kind: string, val?: string): Token {
    const t = this.peek();
    if (!t || t.kind !== kind || (val !== undefined && t.value !== val)) {
      throw SYNTAX_ERROR(`expected ${val ?? kind}, got ${t?.value ?? "EOF"}`);
    }
    return this.next();
  }
}

const isStmtEnd = (t: Token | undefined): boolean =>
  !t ||
  t.kind === "diamond" ||
  t.kind === "newline" ||
  t.kind === "rparen" ||
  t.kind === "rbracket" ||
  t.kind === "semicolon" ||
  (t.kind === "glyph" && (t.value === "}" || t.value === "∇"));

const isFuncStart = (t: Token | undefined, env: ParseEnv): boolean => {
  if (!t) return false;
  if (t.kind === "glyph") {
    if (t.value === "{") return true;
    if (DYADIC_OPERATOR_PRIMS.has(t.value)) return true;
    return FUNCTION_GLYPH_CHARS.has(t.value) || t.value === "∘";
  }
  if (t.kind === "name" && env.funcNames.has(t.value)) return true;
  return false;
};

/** Parse a complete program (multi-statement source) */
export function parseProgram(src: string, env: ParseEnv): Program {
  const tokens = tokenize(src);
  const cur = new Cursor(tokens);
  const statements: AnyNode[] = [];
  while (!cur.done()) {
    const tok = cur.peek();
    if (tok?.kind === "diamond" || tok?.kind === "newline") {
      cur.next();
      continue;
    }
    // ∇ statement ∇ is the tradfn wrapper marking a function definition
    // boundary. Parse a single statement; require a closing ∇.
    if (tok?.kind === "glyph" && tok.value === "∇") {
      cur.next();
      const inner = parseExpr(cur, env);
      const closer = cur.peek();
      if (closer?.kind !== "glyph" || closer.value !== "∇") {
        throw SYNTAX_ERROR("expected closing ∇");
      }
      cur.next();
      statements.push(inner);
      const after = cur.peek();
      if (after?.kind === "diamond" || after?.kind === "newline") cur.next();
      continue;
    }
    const node = parseExpr(cur, env);
    statements.push(node);
    if (!cur.done()) {
      const t = cur.peek();
      if (t?.kind === "diamond" || t?.kind === "newline") cur.next();
      else if (!cur.done())
        throw SYNTAX_ERROR(`unexpected token ${t?.value}`);
    }
  }
  return { statements };
}

/** Parse a single expression. May be a value or function expression. */
function parseExpr(cur: Cursor, env: ParseEnv): AnyNode {
  // Detect assignment: name ← rhs
  const t0 = cur.peek();
  const t1 = cur.peek(1);
  if (t0?.kind === "name" && t1?.kind === "assign") {
    const name = t0.value;
    cur.next();
    cur.next();
    const rhs = parseExpr(cur, env);
    if (isFuncNode(rhs)) {
      env.funcNames.add(name);
    } else {
      env.funcNames.delete(name);
    }
    return { type: "assign", name, rhs };
  }

  if (isFuncStart(t0, env)) {
    const fn = parseFunc(cur, env);
    if (isStmtEnd(cur.peek())) {
      // Function expression with no argument: return as function
      return fn;
    }
    const arg = parseExpr(cur, env);
    if (isFuncNode(arg)) {
      throw SYNTAX_ERROR("function applied to function (trains not supported)");
    }
    return { type: "monadic", fn, arg };
  }

  const left = parseStrand(cur, env);
  if (isStmtEnd(cur.peek())) return left;

  // Could be indexing: value [ ... ]
  let cursorLeft: ValueNode = left;
  while (cur.peek()?.kind === "lbracket") {
    cur.next();
    const indices: (ValueNode | null)[] = [];
    let current: ValueNode | null = null;
    while (cur.peek() && cur.peek()!.kind !== "rbracket") {
      if (cur.peek()!.kind === "semicolon") {
        indices.push(current);
        current = null;
        cur.next();
        continue;
      }
      const e = parseExpr(cur, env);
      if (isFuncNode(e)) throw SYNTAX_ERROR("function as index");
      current = e;
    }
    indices.push(current);
    cur.expect("rbracket");
    cursorLeft = { type: "index", base: cursorLeft, indices };
  }

  if (isStmtEnd(cur.peek())) return cursorLeft;

  if (!isFuncStart(cur.peek(), env)) {
    throw SYNTAX_ERROR(`expected function, got ${cur.peek()?.value}`);
  }
  const fn = parseFunc(cur, env);
  if (isStmtEnd(cur.peek())) {
    // Trailing function with no right arg after a value: not meaningful as expr
    throw SYNTAX_ERROR("missing right argument");
  }
  const right = parseExpr(cur, env);
  if (isFuncNode(right))
    throw SYNTAX_ERROR("function applied as right argument of dyadic");
  return { type: "dyadic", fn, left: cursorLeft, right };
}

/** Parse stranded values: numeric/character literals + variables juxtaposed */
function parseStrand(cur: Cursor, env: ParseEnv): ValueNode {
  const items: ValueNode[] = [parseAtom(cur, env)];
  while (canStrand(items[items.length - 1], cur.peek(), env)) {
    items.push(parseAtom(cur, env));
  }
  if (items.length === 1) return items[0];
  return { type: "strand", items };
}

function canStrand(
  prev: ValueNode,
  t: Token | undefined,
  env: ParseEnv
): boolean {
  if (!t) return false;
  if (prev.type === "paren") return false;
  if (prev.type === "index") return false;
  if (t.kind === "number" || t.kind === "string") return true;
  if (t.kind === "name") {
    if (VALUE_NAMES.has(t.value)) return true;
    return !env.funcNames.has(t.value);
  }
  return false;
}

function parseAtom(cur: Cursor, env: ParseEnv): ValueNode {
  const t = cur.peek();
  if (!t) throw SYNTAX_ERROR("unexpected end of input");
  if (t.kind === "number") {
    cur.next();
    return { type: "num", value: parseFloat(t.value) };
  }
  if (t.kind === "string") {
    cur.next();
    return { type: "str", value: t.value };
  }
  if (t.kind === "name") {
    cur.next();
    return { type: "var", name: t.value };
  }
  if (t.kind === "lparen") {
    cur.next();
    const inner = parseExpr(cur, env);
    cur.expect("rparen");
    if (isFuncNode(inner)) {
      throw SYNTAX_ERROR("parenthesized function used in value position");
    }
    return { type: "paren", expr: inner };
  }
  throw SYNTAX_ERROR(`expected value, got ${t.value}`);
}

/** Parse a function with operator suffixes. */
function parseFunc(cur: Cursor, env: ParseEnv): FuncNode {
  let f: FuncNode = parseFuncAtom(cur, env);

  // Operator chain
  while (true) {
    const t = cur.peek();
    if (!t) break;
    if (t.kind === "glyph" && MONADIC_OPERATOR_CHARS.has(t.value)) {
      cur.next();
      f = { type: "derived1", op: t.value, left: f };
      continue;
    }
    // Inner product f.g
    if (t.kind === "glyph" && t.value === ".") {
      cur.next();
      const g = parseFuncAtom(cur, env);
      f = { type: "derived2", op: ".", left: f, right: g };
      continue;
    }
    // Operators that accept a value or function as right operand: ⍣ ⍤ @
    if (t.kind === "glyph" && DYADIC_VAL_OPERATORS.has(t.value)) {
      const op = t.value;
      cur.next();
      const nt = cur.peek();
      if (isFuncStart(nt, env)) {
        const g = parseFuncAtom(cur, env);
        f = { type: "derivedOp", op, left: f, rightFn: g };
      } else {
        const v = parseAtom(cur, env);
        f = { type: "derivedOp", op, left: f, rightVal: v };
      }
      continue;
    }
    break;
  }
  return f;
}

function parseFuncAtom(cur: Cursor, env: ParseEnv): FuncNode {
  const t = cur.peek();
  if (!t) throw SYNTAX_ERROR("expected function");

  // Outer product: ∘.f  (consume ∘ then . then function)
  if (t.kind === "glyph" && t.value === "∘") {
    const t1 = cur.peek(1);
    if (t1?.kind === "glyph" && t1.value === ".") {
      cur.next();
      cur.next();
      const g = parseFuncAtom(cur, env);
      return {
        type: "derived2",
        op: "∘.",
        left: { type: "prim", glyph: "∘" },
        right: g,
      };
    }
    throw SYNTAX_ERROR("∘ must be followed by .");
  }

  if (
    t.kind === "glyph" &&
    (FUNCTION_GLYPH_CHARS.has(t.value) || DYADIC_OPERATOR_PRIMS.has(t.value))
  ) {
    cur.next();
    return { type: "prim", glyph: t.value };
  }
  if (t.kind === "name" && env.funcNames.has(t.value)) {
    cur.next();
    return { type: "funcVar", name: t.value };
  }
  if (t.kind === "glyph" && t.value === "{") {
    cur.next();
    const body: ValueNode[] = [];
    // Inside dfn, ⍺ and ⍵ are accessible. Parse statements until }.
    while (cur.peek() && !(cur.peek()!.kind === "glyph" && cur.peek()!.value === "}")) {
      if (cur.peek()!.kind === "diamond" || cur.peek()!.kind === "newline") {
        cur.next();
        continue;
      }
      const e = parseExpr(cur, env);
      if (isFuncNode(e))
        throw SYNTAX_ERROR("dfn body item is not a value expression");
      body.push(e);
      const nxt = cur.peek();
      if (nxt?.kind === "diamond" || nxt?.kind === "newline") cur.next();
    }
    if (!cur.peek()) throw SYNTAX_ERROR("unterminated dfn (missing })");
    cur.next();
    return { type: "dfn", body };
  }
  if (t.kind === "lparen") {
    cur.next();
    const inner = parseExpr(cur, env);
    cur.expect("rparen");
    if (!isFuncNode(inner))
      throw SYNTAX_ERROR("expected function in parens");
    return { type: "parenFunc", inner };
  }
  throw SYNTAX_ERROR(`expected function, got "${t.value}"`);
}
