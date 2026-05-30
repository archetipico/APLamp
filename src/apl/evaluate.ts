import type { AnyNode, FuncNode, ValueNode } from "./ast";
import { isFuncNode } from "./ast";
import {
  count,
  DOMAIN_ERROR,
  empty,
  INDEX_ERROR,
  isScalar,
  LENGTH_ERROR,
  NONCE_ERROR,
  rank,
  RANK_ERROR,
  scalar,
  VALUE_ERROR,
} from "./types";
import type { APLArray, APLScalar } from "./types";
import { MONADIC_DISPATCH, DYADIC_DISPATCH } from "./registry";
import { parseProgram, emptyEnv } from "./parse";
import { replicateDy, expandDy } from "./primitives";

export type FuncValue =
  | { kind: "prim"; glyph: string }
  | { kind: "dfn"; body: ValueNode[]; capturedEnv: Env }
  | { kind: "derived1"; op: string; left: FuncValue }
  | { kind: "derived2"; op: string; left: FuncValue; right: FuncValue }
  | {
      kind: "derivedOp";
      op: string;
      left: FuncValue;
      rightFn?: FuncValue;
      rightVal?: APLArray;
    };

export class Env {
  vars = new Map<string, APLArray>();
  funcs = new Map<string, FuncValue>();
  constructor(public parent?: Env) {}
  lookupVar(name: string): APLArray | undefined {
    if (this.vars.has(name)) return this.vars.get(name);
    return this.parent?.lookupVar(name);
  }
  lookupFunc(name: string): FuncValue | undefined {
    if (this.funcs.has(name)) return this.funcs.get(name);
    return this.parent?.lookupFunc(name);
  }
  setVar(name: string, v: APLArray) {
    this.vars.set(name, v);
    this.funcs.delete(name);
  }
  setFunc(name: string, f: FuncValue) {
    this.funcs.set(name, f);
    this.vars.delete(name);
  }
}

const num = (n: number): APLArray => scalar(n);

const compileFunc = (n: FuncNode, env: Env): FuncValue => {
  switch (n.type) {
    case "prim":
      return { kind: "prim", glyph: n.glyph };
    case "funcVar": {
      const fv = env.lookupFunc(n.name);
      if (!fv) throw VALUE_ERROR(`function "${n.name}" not defined`);
      return fv;
    }
    case "dfn":
      return { kind: "dfn", body: n.body, capturedEnv: env };
    case "derived1":
      return { kind: "derived1", op: n.op, left: compileFunc(n.left, env) };
    case "derived2":
      return {
        kind: "derived2",
        op: n.op,
        left: compileFunc(n.left, env),
        right: compileFunc(n.right, env),
      };
    case "derivedOp":
      return {
        kind: "derivedOp",
        op: n.op,
        left: compileFunc(n.left, env),
        rightFn: n.rightFn ? compileFunc(n.rightFn, env) : undefined,
        rightVal: n.rightVal ? evalValue(n.rightVal, env) : undefined,
      };
    case "parenFunc":
      return compileFunc(n.inner, env);
  }
};

/* ---------- core evaluation ---------- */

export const evaluate = (node: AnyNode, env: Env): APLArray | FuncValue => {
  if (isFuncNode(node)) return compileFunc(node, env);
  return evalValue(node, env);
};

const evalValue = (node: ValueNode, env: Env): APLArray => {
  switch (node.type) {
    case "num":
      return num(node.value);
    case "str": {
      if (node.value.length === 1) return scalar(node.value);
      return { shape: [node.value.length], data: node.value.split("") };
    }
    case "strand": {
      const items = node.items.map((n) => evalValue(n, env));
      const allScalars = items.every((x) => isScalar(x));
      if (allScalars) {
        return { shape: [items.length], data: items.map((x) => x.data[0]) };
      }
      const flat: APLScalar[] = [];
      for (const x of items) {
        if (isScalar(x)) flat.push(x.data[0]);
        else flat.push(...x.data);
      }
      return { shape: [flat.length], data: flat };
    }
    case "var": {
      if (node.name === "⍵" || node.name === "⍺") {
        const v = env.lookupVar(node.name);
        if (!v) throw VALUE_ERROR(`${node.name} not bound`);
        return v;
      }
      if (node.name === "⍬") return { shape: [0], data: [] };
      if (node.name === "⍞") return { shape: [0], data: [] };
      if (node.name.startsWith("⎕")) return resolveQuad(node.name);
      const v = env.lookupVar(node.name);
      if (v) return v;
      const fv = env.lookupFunc(node.name);
      if (fv) throw DOMAIN_ERROR(`"${node.name}" is a function, not a value`);
      throw VALUE_ERROR(`undefined name "${node.name}"`);
    }
    case "paren":
      return evalValue(node.expr, env);
    case "monadic": {
      const arg = evalValue(node.arg, env);
      const fn = compileFunc(node.fn, env);
      return applyMonadic(fn, arg, env);
    }
    case "dyadic": {
      const left = evalValue(node.left, env);
      const right = evalValue(node.right, env);
      const fn = compileFunc(node.fn, env);
      return applyDyadic(fn, left, right, env);
    }
    case "assign": {
      if (isFuncNode(node.rhs)) {
        const fv = compileFunc(node.rhs, env);
        env.setFunc(node.name, fv);
        return empty();
      }
      const v = evalValue(node.rhs, env);
      env.setVar(node.name, v);
      return v;
    }
    case "index":
      return doIndex(node, env);
  }
};

const doIndex = (
  node: Extract<ValueNode, { type: "index" }>,
  env: Env
): APLArray => {
  const base = evalValue(node.base, env);
  if (rank(base) === 0) throw RANK_ERROR("cannot index scalar");
  if (node.indices.length === 1 && rank(base) === 1) {
    const ix = node.indices[0];
    if (!ix) return base;
    const sel = evalValue(ix, env);
    const idxs = sel.data.map((v) => {
      if (typeof v !== "number") throw DOMAIN_ERROR("index");
      const i = v - 1;
      if (i < 0 || i >= base.data.length) throw INDEX_ERROR();
      return base.data[i];
    });
    return { shape: [...sel.shape], data: idxs };
  }
  if (node.indices.length === rank(base)) {
    // multi-dim indexing
    const dimSels = node.indices.map((ix, dim) => {
      if (!ix) {
        const out: number[] = [];
        for (let i = 0; i < base.shape[dim]; i++) out.push(i);
        return out;
      }
      const v = evalValue(ix, env);
      return v.data.map((x) => {
        if (typeof x !== "number") throw DOMAIN_ERROR("index");
        const i = x - 1;
        if (i < 0 || i >= base.shape[dim]) throw INDEX_ERROR();
        return i;
      });
    });
    const outShape = dimSels.map((s) => s.length);
    const out: APLScalar[] = [];
    const strides: number[] = new Array(base.shape.length);
    strides[base.shape.length - 1] = 1;
    for (let i = base.shape.length - 2; i >= 0; i--)
      strides[i] = strides[i + 1] * base.shape[i + 1];
    const rec = (dim: number, offset: number) => {
      if (dim === base.shape.length) {
        out.push(base.data[offset]);
        return;
      }
      for (const idx of dimSels[dim]) {
        rec(dim + 1, offset + idx * strides[dim]);
      }
    };
    rec(0, 0);
    return { shape: outShape, data: out };
  }
  throw RANK_ERROR("index: rank mismatch");
};

/* ---------- function application ---------- */

/** System (quad) names. Returns the value bound to ⎕X. */
const resolveQuad = (name: string): APLArray => {
  switch (name) {
    case "⎕IO":
      return scalar(1);
    case "⎕A":
      return {
        shape: [26],
        data: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      };
    case "⎕D":
      return { shape: [10], data: "0123456789".split("") };
    case "⎕TS": {
      const d = new Date();
      return {
        shape: [7],
        data: [
          d.getFullYear(),
          d.getMonth() + 1,
          d.getDate(),
          d.getHours(),
          d.getMinutes(),
          d.getSeconds(),
          d.getMilliseconds(),
        ],
      };
    }
    case "⎕AV":
      // limited atomic vector: printable ASCII
      return {
        shape: [95],
        data: Array.from({ length: 95 }, (_, i) =>
          String.fromCharCode(32 + i)
        ),
      };
    default:
      throw VALUE_ERROR(`unknown system name ${name}`);
  }
};

/** ⍎ execute: parse and run a character vector in the current runtime env. */
const executeString = (arg: APLArray, env: Env): APLArray => {
  if (rank(arg) > 1) throw RANK_ERROR("⍎: rank 0 or 1 required");
  const src = arg.data
    .map((v) => (typeof v === "string" ? v : String(v)))
    .join("");
  const prog = parseProgram(src, emptyEnv());
  let last: APLArray = empty();
  for (const stmt of prog.statements) {
    const v = evaluate(stmt, env);
    if (
      (v as APLArray).data !== undefined &&
      Array.isArray((v as APLArray).shape)
    ) {
      last = v as APLArray;
    }
  }
  return last;
};

const applyMonadic = (
  fn: FuncValue,
  arg: APLArray,
  env: Env
): APLArray => {
  switch (fn.kind) {
    case "prim": {
      if (fn.glyph === "⍎") return executeString(arg, env);
      const f = MONADIC_DISPATCH.get(fn.glyph);
      if (!f) throw DOMAIN_ERROR(`no monadic for "${fn.glyph}"`);
      return f(arg);
    }
    case "dfn": {
      const sub = new Env(fn.capturedEnv);
      sub.setVar("⍵", arg);
      return runDfn(fn.body, sub);
    }
    case "derived1":
      return applyDerived1Mo(fn.op, fn.left, arg, env);
    case "derived2":
      return applyDerived2Mo(fn.op, fn.left, fn.right, arg, env);
    case "derivedOp":
      return applyDerivedOpMo(fn, arg, env);
  }
};

const applyDyadic = (
  fn: FuncValue,
  left: APLArray,
  right: APLArray,
  env: Env
): APLArray => {
  switch (fn.kind) {
    case "prim": {
      // The operator glyphs / ⌿ \ ⍀ also act as primitive functions when used
      // in dyadic value position: replicate/compress and expand respectively.
      if (fn.glyph === "/" || fn.glyph === "⌿") return replicateDy(left, right);
      if (fn.glyph === "\\" || fn.glyph === "⍀") return expandDy(left, right);
      const f = DYADIC_DISPATCH.get(fn.glyph);
      if (!f) throw DOMAIN_ERROR(`no dyadic for "${fn.glyph}"`);
      return f(left, right);
    }
    case "dfn": {
      const sub = new Env(fn.capturedEnv);
      sub.setVar("⍺", left);
      sub.setVar("⍵", right);
      return runDfn(fn.body, sub);
    }
    case "derived1":
      return applyDerived1Dy(fn.op, fn.left, left, right, env);
    case "derived2":
      return applyDerived2Dy(fn.op, fn.left, fn.right, left, right, env);
    case "derivedOp":
      return applyDerivedOpDy(fn, left, right, env);
  }
};

const runDfn = (body: ValueNode[], env: Env): APLArray => {
  let last: APLArray = empty();
  for (const stmt of body) {
    last = evalValue(stmt, env);
  }
  return last;
};

/* ---------- operators ---------- */

const applyDerived1Mo = (
  op: string,
  f: FuncValue,
  arg: APLArray,
  env: Env
): APLArray => {
  switch (op) {
    case "/": {
      // monadic / on a function = reduce along last axis
      if (rank(arg) === 0) return arg;
      const r = rank(arg);
      const last = arg.shape[r - 1];
      if (last === 0) return identityFor(f, arg);
      const prefix = count(arg) / last;
      const out: APLScalar[] = [];
      for (let p = 0; p < prefix; p++) {
        let acc: APLArray = scalar(arg.data[p * last + last - 1]);
        for (let i = last - 2; i >= 0; i--) {
          acc = applyDyadic(f, scalar(arg.data[p * last + i]), acc, env);
        }
        out.push(acc.data[0]);
      }
      const newShape = arg.shape.slice(0, r - 1);
      if (newShape.length === 0) return scalar(out[0]);
      return { shape: newShape, data: out };
    }
    case "⌿": {
      // reduce along first axis
      if (rank(arg) <= 1) return applyDerived1Mo("/", f, arg, env);
      const rows = arg.shape[0];
      const rest = count(arg) / rows;
      const out: APLScalar[] = [];
      for (let c = 0; c < rest; c++) {
        let acc: APLArray = scalar(arg.data[(rows - 1) * rest + c]);
        for (let r = rows - 2; r >= 0; r--) {
          acc = applyDyadic(f, scalar(arg.data[r * rest + c]), acc, env);
        }
        out.push(acc.data[0]);
      }
      return { shape: arg.shape.slice(1), data: out };
    }
    case "\\": {
      // scan along last axis
      if (rank(arg) === 0) return arg;
      const r = rank(arg);
      const last = arg.shape[r - 1];
      const prefix = count(arg) / last;
      const out: APLScalar[] = new Array(count(arg));
      for (let p = 0; p < prefix; p++) {
        for (let i = 0; i < last; i++) {
          if (i === 0) out[p * last + i] = arg.data[p * last + i];
          else {
            let acc: APLArray = scalar(arg.data[p * last + i]);
            for (let j = i - 1; j >= 0; j--) {
              acc = applyDyadic(f, scalar(arg.data[p * last + j]), acc, env);
            }
            out[p * last + i] = acc.data[0];
          }
        }
      }
      return { shape: [...arg.shape], data: out };
    }
    case "⍀": {
      if (rank(arg) <= 1) return applyDerived1Mo("\\", f, arg, env);
      const rows = arg.shape[0];
      const rest = count(arg) / rows;
      const out: APLScalar[] = new Array(count(arg));
      for (let c = 0; c < rest; c++) {
        for (let r = 0; r < rows; r++) {
          if (r === 0) out[r * rest + c] = arg.data[c];
          else {
            let acc: APLArray = scalar(arg.data[r * rest + c]);
            for (let j = r - 1; j >= 0; j--) {
              acc = applyDyadic(f, scalar(arg.data[j * rest + c]), acc, env);
            }
            out[r * rest + c] = acc.data[0];
          }
        }
      }
      return { shape: [...arg.shape], data: out };
    }
    case "¨":
      // each (monadic): apply f to each scalar element
      return {
        shape: [...arg.shape],
        data: arg.data.map((v) => applyMonadic(f, scalar(v), env).data[0]),
      };
    case "⍨":
      // selfie: f⍨ ⍵ = ⍵ f ⍵
      return applyDyadic(f, arg, arg, env);
  }
  throw NONCE_ERROR(`operator ${op}`);
};

const applyDerived1Dy = (
  op: string,
  f: FuncValue,
  left: APLArray,
  right: APLArray,
  env: Env
): APLArray => {
  switch (op) {
    case "/":
      throw NONCE_ERROR("n-wise reduce");
    case "¨": {
      // each (dyadic): conform shapes
      if (isScalar(left)) {
        return {
          shape: [...right.shape],
          data: right.data.map(
            (v) => applyDyadic(f, left, scalar(v), env).data[0]
          ),
        };
      }
      if (isScalar(right)) {
        return {
          shape: [...left.shape],
          data: left.data.map(
            (v) => applyDyadic(f, scalar(v), right, env).data[0]
          ),
        };
      }
      if (
        left.shape.length !== right.shape.length ||
        left.shape.some((s, i) => s !== right.shape[i])
      )
        throw LENGTH_ERROR("¨ shape mismatch");
      return {
        shape: [...left.shape],
        data: left.data.map(
          (v, i) =>
            applyDyadic(f, scalar(v), scalar(right.data[i]), env).data[0]
        ),
      };
    }
    case "⍨":
      // commute: a f⍨ b = b f a
      return applyDyadic(f, right, left, env);
  }
  throw NONCE_ERROR(`dyadic op ${op}`);
};

const applyDerived2Mo = (
  op: string,
  _left: FuncValue,
  _right: FuncValue,
  _arg: APLArray,
  _env: Env
): APLArray => {
  if (op === ".") throw DOMAIN_ERROR("inner product needs two args");
  if (op === "∘.") throw DOMAIN_ERROR("outer product needs two args");
  throw NONCE_ERROR(`derived2 monadic ${op}`);
};

const applyDerived2Dy = (
  op: string,
  left: FuncValue,
  right: FuncValue,
  l: APLArray,
  r: APLArray,
  env: Env
): APLArray => {
  if (op === ".") {
    return innerProduct(left, right, l, r, env);
  }
  if (op === "∘.") {
    return outerProduct(right, l, r, env);
  }
  throw NONCE_ERROR(`derived2 ${op}`);
};

const asPositiveIntScalar = (a: APLArray, ctx: string): number => {
  if (!isScalar(a) && a.shape.length !== 0 && count(a) !== 1)
    throw RANK_ERROR(`${ctx}: scalar required`);
  const v = a.data[0];
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0)
    throw DOMAIN_ERROR(`${ctx}: non-negative integer required`);
  return v;
};

const applyDerivedOpMo = (
  fn: FuncValue & { kind: "derivedOp" },
  arg: APLArray,
  env: Env
): APLArray => {
  switch (fn.op) {
    case "⍣": {
      if (!fn.rightVal)
        throw NONCE_ERROR("⍣: function right operand not supported");
      const n = asPositiveIntScalar(fn.rightVal, "⍣");
      let cur = arg;
      for (let i = 0; i < n; i++) cur = applyMonadic(fn.left, cur, env);
      return cur;
    }
    case "⍤": {
      if (!fn.rightVal) throw NONCE_ERROR("⍤: function right operand not supported");
      const k = asPositiveIntScalar(fn.rightVal, "⍤");
      return applyByCells(fn.left, arg, k, env);
    }
    case "@": {
      if (!fn.rightVal)
        throw NONCE_ERROR("@: right operand must be index vector");
      return atModify(fn.left, fn.rightVal, arg, env);
    }
  }
  throw NONCE_ERROR(`derivedOp ${fn.op}`);
};

const applyDerivedOpDy = (
  fn: FuncValue & { kind: "derivedOp" },
  l: APLArray,
  r: APLArray,
  env: Env
): APLArray => {
  switch (fn.op) {
    case "⍣": {
      if (!fn.rightVal)
        throw NONCE_ERROR("⍣ dyadic: function right operand not supported");
      const n = asPositiveIntScalar(fn.rightVal, "⍣");
      let cur = r;
      for (let i = 0; i < n; i++) cur = applyDyadic(fn.left, l, cur, env);
      return cur;
    }
  }
  throw NONCE_ERROR(`derivedOp dyadic ${fn.op}`);
};

const applyByCells = (
  fn: FuncValue,
  a: APLArray,
  k: number,
  env: Env
): APLArray => {
  const r = rank(a);
  if (k >= r) return applyMonadic(fn, a, env);
  const frameRank = r - k;
  const frameShape = a.shape.slice(0, frameRank);
  const cellShape = a.shape.slice(frameRank);
  const cellLen = cellShape.reduce((p, c) => p * c, 1);
  const frameLen = frameShape.reduce((p, c) => p * c, 1);
  const results: APLArray[] = [];
  for (let f = 0; f < frameLen; f++) {
    const cellData = a.data.slice(f * cellLen, (f + 1) * cellLen);
    const cell: APLArray = { shape: [...cellShape], data: cellData };
    results.push(applyMonadic(fn, cell, env));
  }
  // All result cells must have the same shape; re-assemble with frame prefix.
  const first = results[0];
  if (!first) return { shape: frameShape, data: [] };
  const outCellShape = first.shape;
  for (const r2 of results) {
    if (
      r2.shape.length !== outCellShape.length ||
      r2.shape.some((s, i) => s !== outCellShape[i])
    )
      throw LENGTH_ERROR("⍤: result cells differ in shape");
  }
  const data: APLScalar[] = [];
  for (const r2 of results) data.push(...r2.data);
  return { shape: [...frameShape, ...outCellShape], data };
};

const atModify = (
  fn: FuncValue,
  indices: APLArray,
  x: APLArray,
  env: Env
): APLArray => {
  if (rank(x) !== 1) throw RANK_ERROR("@: vector right argument only");
  if (rank(indices) > 1) throw RANK_ERROR("@: indices vector or scalar");
  const out = [...x.data];
  const idxList = indices.shape.length === 0 ? [indices.data[0]] : indices.data;
  for (const v of idxList) {
    if (typeof v !== "number" || !Number.isInteger(v))
      throw DOMAIN_ERROR("@: integer indices required");
    const i = v - 1;
    if (i < 0 || i >= out.length) throw INDEX_ERROR("@: out of range");
    const replaced = applyMonadic(fn, scalar(out[i]), env);
    out[i] = replaced.data[0];
  }
  return { shape: [...x.shape], data: out };
};

const outerProduct = (
  f: FuncValue,
  a: APLArray,
  b: APLArray,
  env: Env
): APLArray => {
  const outShape = [...a.shape, ...b.shape];
  const out: APLScalar[] = [];
  for (const x of a.data) {
    for (const y of b.data) {
      const v = applyDyadic(f, scalar(x), scalar(y), env);
      out.push(v.data[0]);
    }
  }
  return { shape: outShape, data: out };
};

const innerProduct = (
  fLeft: FuncValue,
  fRight: FuncValue,
  a: APLArray,
  b: APLArray,
  env: Env
): APLArray => {
  // Generic: A f.g B
  // For vectors: scalar = f-reduce of (a g b element-wise)
  if (rank(a) === 1 && rank(b) === 1) {
    if (a.shape[0] !== b.shape[0]) throw LENGTH_ERROR(".");
    let acc: APLArray | null = null;
    for (let i = a.shape[0] - 1; i >= 0; i--) {
      const prod = applyDyadic(
        fRight,
        scalar(a.data[i]),
        scalar(b.data[i]),
        env
      );
      acc = acc === null ? prod : applyDyadic(fLeft, prod, acc, env);
    }
    return acc ?? scalar(0);
  }
  if (rank(a) === 2 && rank(b) === 2) {
    const [ar, ac] = a.shape;
    const [br, bc] = b.shape;
    if (ac !== br) throw LENGTH_ERROR(".");
    const out: APLScalar[] = new Array(ar * bc);
    for (let i = 0; i < ar; i++) {
      for (let j = 0; j < bc; j++) {
        let acc: APLArray | null = null;
        for (let k = ac - 1; k >= 0; k--) {
          const prod = applyDyadic(
            fRight,
            scalar(a.data[i * ac + k]),
            scalar(b.data[k * bc + j]),
            env
          );
          acc = acc === null ? prod : applyDyadic(fLeft, prod, acc, env);
        }
        out[i * bc + j] = acc!.data[0];
      }
    }
    return { shape: [ar, bc], data: out };
  }
  if (rank(a) === 2 && rank(b) === 1) {
    const [ar, ac] = a.shape;
    if (ac !== b.shape[0]) throw LENGTH_ERROR(".");
    const out: APLScalar[] = new Array(ar);
    for (let i = 0; i < ar; i++) {
      let acc: APLArray | null = null;
      for (let k = ac - 1; k >= 0; k--) {
        const prod = applyDyadic(
          fRight,
          scalar(a.data[i * ac + k]),
          scalar(b.data[k]),
          env
        );
        acc = acc === null ? prod : applyDyadic(fLeft, prod, acc, env);
      }
      out[i] = acc!.data[0];
    }
    return { shape: [ar], data: out };
  }
  if (rank(a) === 1 && rank(b) === 2) {
    const [br, bc] = b.shape;
    if (a.shape[0] !== br) throw LENGTH_ERROR(".");
    const out: APLScalar[] = new Array(bc);
    for (let j = 0; j < bc; j++) {
      let acc: APLArray | null = null;
      for (let k = br - 1; k >= 0; k--) {
        const prod = applyDyadic(
          fRight,
          scalar(a.data[k]),
          scalar(b.data[k * bc + j]),
          env
        );
        acc = acc === null ? prod : applyDyadic(fLeft, prod, acc, env);
      }
      out[j] = acc!.data[0];
    }
    return { shape: [bc], data: out };
  }
  throw RANK_ERROR("inner product: unsupported ranks");
};

const identityFor = (f: FuncValue, _arg: APLArray): APLArray => {
  if (f.kind !== "prim") return scalar(0);
  switch (f.glyph) {
    case "+":
    case "-":
    case "∨":
    case "≠":
      return scalar(0);
    case "×":
    case "÷":
    case "∧":
    case "=":
    case "*":
      return scalar(1);
    case "⌈":
      return scalar(-Infinity);
    case "⌊":
      return scalar(Infinity);
    default:
      return scalar(0);
  }
};

