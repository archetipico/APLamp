import type { APLArray, APLScalar } from "./types";
import {
  count,
  DOMAIN_ERROR,
  INDEX_ERROR,
  isNested,
  isScalar,
  LENGTH_ERROR,
  RANK_ERROR,
  rank,
  scalar,
} from "./types";

/* ---------- shape utilities ---------- */

const ravel = (a: APLArray): APLArray => ({
  shape: [count(a)],
  data: [...a.data],
});

const numericOnly = (a: APLArray): number[] => {
  const out: number[] = [];
  for (const v of a.data) {
    if (typeof v !== "number") throw DOMAIN_ERROR("expected numeric");
    out.push(v);
  }
  return out;
};

const sameShape = (a: APLArray, b: APLArray): boolean =>
  a.shape.length === b.shape.length &&
  a.shape.every((s, i) => s === b.shape[i]);

/**
 * Scalar broadcasting for dyadic scalar functions.
 * APL singleton extension: any one-element array (any rank) conforms to the
 * other operand's shape, so `(,5) + 1 2 3` works the same as `5 + 1 2 3`.
 */
const scalarPervade = (
  left: APLArray,
  right: APLArray,
  f: (a: APLScalar, b: APLScalar) => APLScalar
): APLArray => {
  const leftSingleton = count(left) === 1;
  const rightSingleton = count(right) === 1;
  if (isScalar(left) && isScalar(right)) {
    return scalar(f(left.data[0], right.data[0]));
  }
  if (leftSingleton && rightSingleton) {
    const shape = left.shape.length >= right.shape.length ? left.shape : right.shape;
    return { shape: [...shape], data: [f(left.data[0], right.data[0])] };
  }
  if (isScalar(left) || leftSingleton) {
    const lv = left.data[0];
    return {
      shape: [...right.shape],
      data: right.data.map((v) => f(lv, v)),
    };
  }
  if (isScalar(right) || rightSingleton) {
    const rv = right.data[0];
    return {
      shape: [...left.shape],
      data: left.data.map((v) => f(v, rv)),
    };
  }
  if (!sameShape(left, right)) throw LENGTH_ERROR("shape mismatch");
  return {
    shape: [...left.shape],
    data: left.data.map((v, i) => f(v, right.data[i])),
  };
};

const scalarPervadeMonad = (
  a: APLArray,
  f: (v: APLScalar) => APLScalar
): APLArray => ({
  shape: [...a.shape],
  data: a.data.map(f),
});

const asNum = (v: APLScalar): number => {
  if (typeof v !== "number") throw DOMAIN_ERROR("number required");
  return v;
};

const asInt = (v: APLScalar): number => {
  const n = asNum(v);
  if (!Number.isInteger(n)) throw DOMAIN_ERROR("integer required");
  return n;
};

const boolish = (v: APLScalar): 0 | 1 => {
  const n = asNum(v);
  if (n === 0) return 0;
  if (n === 1) return 1;
  throw DOMAIN_ERROR("boolean required");
};

/* ---------- arithmetic ---------- */

export const plusDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => asNum(x) + asNum(y));
export const plusMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => asNum(v));

export const minusDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => asNum(x) - asNum(y));
export const minusMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => -asNum(v));

export const timesDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => asNum(x) * asNum(y));
export const timesMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => {
    const n = asNum(v);
    return n > 0 ? 1 : n < 0 ? -1 : 0;
  });

export const divideDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => {
    const xn = asNum(x);
    const yn = asNum(y);
    if (yn === 0) {
      if (xn === 0) return 1;
      throw DOMAIN_ERROR("divide by zero");
    }
    return xn / yn;
  });
export const divideMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => {
    const n = asNum(v);
    if (n === 0) throw DOMAIN_ERROR("reciprocal of zero");
    return 1 / n;
  });

export const powerDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => Math.pow(asNum(x), asNum(y)));
export const powerMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => Math.exp(asNum(v)));

export const logDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => Math.log(asNum(y)) / Math.log(asNum(x)));
export const logMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => Math.log(asNum(v)));

export const maxDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => Math.max(asNum(x), asNum(y)));
export const maxMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => Math.ceil(asNum(v)));

export const minDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => Math.min(asNum(x), asNum(y)));
export const minMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => Math.floor(asNum(v)));

export const modDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => {
    const m = asNum(x);
    const n = asNum(y);
    if (m === 0) return n;
    const r = n - m * Math.floor(n / m);
    return r;
  });
export const absMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => Math.abs(asNum(v)));

export const factorialMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => {
    const n = asNum(v);
    if (!Number.isInteger(n) || n < 0)
      throw DOMAIN_ERROR("factorial requires non-negative integer");
    let p = 1;
    for (let i = 2; i <= n; i++) p *= i;
    return p;
  });

export const binomialDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => {
    const k = asInt(x);
    const n = asInt(y);
    if (k < 0 || n < 0 || k > n) return 0;
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return Math.round(r);
  });

export const rollMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => {
    const n = asInt(v);
    if (n <= 0) throw DOMAIN_ERROR("roll: positive integer required");
    return Math.floor(Math.random() * n) + 1;
  });

export const circleMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => Math.PI * asNum(v));

export const circleDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => {
    const k = asInt(x);
    const n = asNum(y);
    switch (k) {
      case 0:
        return Math.sqrt(1 - n * n);
      case 1:
        return Math.sin(n);
      case 2:
        return Math.cos(n);
      case 3:
        return Math.tan(n);
      case -1:
        return Math.asin(n);
      case -2:
        return Math.acos(n);
      case -3:
        return Math.atan(n);
      case 5:
        return Math.sinh(n);
      case 6:
        return Math.cosh(n);
      case 7:
        return Math.tanh(n);
      default:
        throw DOMAIN_ERROR(`circle: unsupported ${k}`);
    }
  });

/* ---------- comparison ---------- */

const tol = 1e-13;
const eq = (x: APLScalar, y: APLScalar): boolean => {
  if (typeof x === "number" && typeof y === "number")
    return Math.abs(x - y) < tol;
  return x === y;
};

export const eqDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => (eq(x, y) ? 1 : 0));
export const neDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => (eq(x, y) ? 0 : 1));
export const ltDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => (asNum(x) < asNum(y) ? 1 : 0));
export const leDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) =>
    asNum(x) < asNum(y) || eq(x, y) ? 1 : 0
  );
export const gtDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => (asNum(x) > asNum(y) ? 1 : 0));
export const geDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) =>
    asNum(x) > asNum(y) || eq(x, y) ? 1 : 0
  );

const scalarMatch = (x: APLScalar, y: APLScalar): boolean => {
  const xn = isNested(x);
  const yn = isNested(y);
  if (xn !== yn) return false;
  if (xn && yn) return arrayMatch(x as APLArray, y as APLArray);
  return eq(x, y);
};

const arrayMatch = (a: APLArray, b: APLArray): boolean => {
  if (!sameShape(a, b)) return false;
  for (let i = 0; i < a.data.length; i++) {
    if (!scalarMatch(a.data[i], b.data[i])) return false;
  }
  return true;
};

const scalarDepth = (v: APLScalar): number =>
  isNested(v) ? arrayDepth(v as APLArray) : 0;

const arrayDepth = (a: APLArray): number => {
  if (count(a) === 0) return 1;
  let max = 0;
  for (const v of a.data) {
    const d = scalarDepth(v);
    if (d > max) max = d;
  }
  return 1 + max;
};

export const matchDy = (a: APLArray, b: APLArray): APLArray =>
  scalar(arrayMatch(a, b) ? 1 : 0);

export const matchMo = (a: APLArray): APLArray => {
  if (isScalar(a) && !isNested(a.data[0])) return scalar(0);
  return scalar(arrayDepth(a));
};

export const notMatchDy = (a: APLArray, b: APLArray): APLArray =>
  scalar(arrayMatch(a, b) ? 0 : 1);

export const tallyMo = (a: APLArray): APLArray => {
  if (isScalar(a)) return scalar(1);
  return scalar(a.shape[0]);
};

/* ---------- logical ---------- */

export const andDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => boolish(x) & boolish(y));
export const orDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => boolish(x) | boolish(y));
export const nandDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => (boolish(x) & boolish(y) ? 0 : 1));
export const norDy = (a: APLArray, b: APLArray): APLArray =>
  scalarPervade(a, b, (x, y) => (boolish(x) | boolish(y) ? 0 : 1));
export const notMo = (a: APLArray): APLArray =>
  scalarPervadeMonad(a, (v) => (boolish(v) ? 0 : 1));

/* ---------- structural ---------- */

export const iotaMo = (a: APLArray): APLArray => {
  if (!isScalar(a) && rank(a) !== 1)
    throw RANK_ERROR("⍳ requires scalar or vector");
  const dims = a.data.map((v) => asInt(v));
  if (dims.some((d) => d < 0)) throw DOMAIN_ERROR("⍳ negative");
  if (dims.length === 1) {
    const n = dims[0];
    const out: number[] = [];
    for (let i = 1; i <= n; i++) out.push(i);
    return { shape: [n], data: out };
  }
  throw DOMAIN_ERROR("⍳ only supports vector argument of length 1");
};

export const iotaDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) !== 1) throw RANK_ERROR("⍳: left must be vector");
  const lookup = (v: APLScalar): number => {
    for (let i = 0; i < a.data.length; i++) {
      if (eq(a.data[i], v)) return i + 1;
    }
    return a.data.length + 1;
  };
  return {
    shape: [...b.shape],
    data: b.data.map(lookup),
  };
};

export const shapeMo = (a: APLArray): APLArray => ({
  shape: [a.shape.length],
  data: a.shape.map((n) => n),
});

export const shapeDy = (left: APLArray, right: APLArray): APLArray => {
  const newShape = numericOnly(left).map((n) => {
    if (n < 0 || !Number.isInteger(n)) throw DOMAIN_ERROR("shape must be non-negative integers");
    return n;
  });
  const total = newShape.reduce((p, c) => p * c, 1);
  const src = right.data;
  if (src.length === 0 && total > 0)
    throw DOMAIN_ERROR("cannot reshape empty into non-empty");
  const data: APLScalar[] = [];
  for (let i = 0; i < total; i++) data.push(src[i % src.length]);
  return { shape: newShape, data };
};

export const ravelDy = (a: APLArray, b: APLArray): APLArray => {
  if (isScalar(a) && isScalar(b)) {
    return { shape: [2], data: [a.data[0], b.data[0]] };
  }
  if (isScalar(a))
    return { shape: [count(b) + 1], data: [a.data[0], ...b.data] };
  if (isScalar(b))
    return { shape: [count(a) + 1], data: [...a.data, b.data[0]] };
  if (rank(a) === 1 && rank(b) === 1) {
    return { shape: [a.shape[0] + b.shape[0]], data: [...a.data, ...b.data] };
  }
  if (rank(a) === 2 && rank(b) === 2) {
    if (a.shape[0] !== b.shape[0])
      throw LENGTH_ERROR("rows must match");
    const rows = a.shape[0];
    const aCols = a.shape[1];
    const bCols = b.shape[1];
    const out: APLScalar[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < aCols; c++) out.push(a.data[r * aCols + c]);
      for (let c = 0; c < bCols; c++) out.push(b.data[r * bCols + c]);
    }
    return { shape: [rows, aCols + bCols], data: out };
  }
  throw RANK_ERROR("catenate: unsupported ranks");
};

export const ravelMo = (a: APLArray): APLArray => ravel(a);

export const tableMo = (a: APLArray): APLArray => {
  if (rank(a) === 0) return { shape: [1, 1], data: [a.data[0]] };
  if (rank(a) === 1) return { shape: [a.shape[0], 1], data: [...a.data] };
  return a;
};

export const tableDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) === 1 && rank(b) === 1) {
    if (a.shape[0] !== b.shape[0])
      throw LENGTH_ERROR("vector length mismatch for ⍪");
    return { shape: [2, a.shape[0]], data: [...a.data, ...b.data] };
  }
  if (rank(a) === 2 && rank(b) === 2) {
    if (a.shape[1] !== b.shape[1])
      throw LENGTH_ERROR("cols must match for ⍪");
    return {
      shape: [a.shape[0] + b.shape[0], a.shape[1]],
      data: [...a.data, ...b.data],
    };
  }
  throw RANK_ERROR("⍪: unsupported ranks");
};

export const reverseLastMo = (a: APLArray): APLArray => {
  if (rank(a) === 0) return a;
  const s = a.shape;
  const last = s[s.length - 1];
  const prefix = count(a) / last;
  const out: APLScalar[] = new Array(count(a));
  for (let p = 0; p < prefix; p++) {
    for (let i = 0; i < last; i++) {
      out[p * last + (last - 1 - i)] = a.data[p * last + i];
    }
  }
  return { shape: [...s], data: out };
};

export const reverseFirstMo = (a: APLArray): APLArray => {
  if (rank(a) === 0) return a;
  if (rank(a) === 1) return reverseLastMo(a);
  const s = a.shape;
  const rows = s[0];
  const rest = count(a) / rows;
  const out: APLScalar[] = new Array(count(a));
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < rest; i++) {
      out[(rows - 1 - r) * rest + i] = a.data[r * rest + i];
    }
  }
  return { shape: [...s], data: out };
};

export const rotateLastDy = (a: APLArray, b: APLArray): APLArray => {
  if (!isScalar(a)) throw RANK_ERROR("rotate: left scalar only");
  const k = asInt(a.data[0]);
  if (rank(b) === 0) return b;
  const s = b.shape;
  const last = s[s.length - 1];
  const prefix = count(b) / last;
  const out: APLScalar[] = new Array(count(b));
  for (let p = 0; p < prefix; p++) {
    for (let i = 0; i < last; i++) {
      const src = ((i + k) % last + last) % last;
      out[p * last + i] = b.data[p * last + src];
    }
  }
  return { shape: [...s], data: out };
};

export const rotateFirstDy = (a: APLArray, b: APLArray): APLArray => {
  if (!isScalar(a)) throw RANK_ERROR("rotate-first: left scalar only");
  const k = asInt(a.data[0]);
  if (rank(b) === 0) return b;
  if (rank(b) === 1) return rotateLastDy(a, b);
  const s = b.shape;
  const rows = s[0];
  const rest = count(b) / rows;
  const out: APLScalar[] = new Array(count(b));
  for (let r = 0; r < rows; r++) {
    const src = ((r + k) % rows + rows) % rows;
    for (let i = 0; i < rest; i++) {
      out[r * rest + i] = b.data[src * rest + i];
    }
  }
  return { shape: [...s], data: out };
};

export const transposeMo = (a: APLArray): APLArray => {
  if (rank(a) <= 1) return a;
  if (rank(a) === 2) {
    const [r, c] = a.shape;
    const out: APLScalar[] = new Array(r * c);
    for (let i = 0; i < r; i++)
      for (let j = 0; j < c; j++) out[j * r + i] = a.data[i * c + j];
    return { shape: [c, r], data: out };
  }
  throw RANK_ERROR("transpose: rank > 2 not supported");
};

export const takeDy = (left: APLArray, right: APLArray): APLArray => {
  if (!isScalar(left) && rank(left) !== 1)
    throw RANK_ERROR("take: left scalar or vector");
  const dims = numericOnly(left).map((v) => Math.trunc(v));
  if (dims.length === 1) {
    const k = dims[0];
    const src = rank(right) === 0 ? [right.data[0]] : right.data;
    const total = Math.abs(k);
    const out: APLScalar[] = [];
    if (k >= 0) {
      for (let i = 0; i < total; i++) {
        out.push(i < src.length ? src[i] : fillOf(right));
      }
    } else {
      for (let i = 0; i < total; i++) {
        const idx = src.length - total + i;
        out.push(idx >= 0 && idx < src.length ? src[idx] : fillOf(right));
      }
    }
    return { shape: [total], data: out };
  }
  throw RANK_ERROR("take: only 1D left supported");
};

export const dropDy = (left: APLArray, right: APLArray): APLArray => {
  if (!isScalar(left) && rank(left) !== 1)
    throw RANK_ERROR("drop: left scalar or vector");
  const dims = numericOnly(left).map((v) => Math.trunc(v));
  if (dims.length === 1) {
    const k = dims[0];
    const src = rank(right) === 0 ? [right.data[0]] : right.data;
    let out: APLScalar[];
    if (k >= 0) out = src.slice(Math.min(k, src.length));
    else out = src.slice(0, Math.max(0, src.length + k));
    return { shape: [out.length], data: out };
  }
  throw RANK_ERROR("drop: only 1D left supported");
};

const fillOf = (a: APLArray): APLScalar => {
  if (a.data.length === 0) return 0;
  return typeof a.data[0] === "number" ? 0 : " ";
};

export const encloseMo = (a: APLArray): APLArray => {
  if (isScalar(a)) return a;
  return { shape: [], data: [a as APLScalar] };
};

export const nestMo = (a: APLArray): APLArray => {
  // Nest: if X is already a simple scalar, leave it alone; otherwise enclose.
  // This makes ⊆ a no-op on already-nested data and equivalent to ⊂ on flat
  // arrays. Useful as a "guaranteed scalar" wrapper.
  if (isScalar(a) && !isNested(a.data[0])) return a;
  return encloseMo(a);
};

export const partitionDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) > 1 || rank(b) > 1) throw RANK_ERROR("⊆: vectors only");
  if (a.shape[0] !== b.shape[0]) throw LENGTH_ERROR("⊆: length mismatch");
  const groups: APLScalar[][] = [];
  let prev = 0;
  for (let i = 0; i < a.data.length; i++) {
    const k = asInt(a.data[i]);
    if (k < 0) throw DOMAIN_ERROR("⊆: non-negative integers required");
    if (k === 0) {
      prev = 0;
      continue;
    }
    if (k !== prev) groups.push([b.data[i]]);
    else groups[groups.length - 1].push(b.data[i]);
    prev = k;
  }
  const wrapped: APLScalar[] = groups.map((g) => ({
    shape: [g.length],
    data: g,
  }));
  return { shape: [wrapped.length], data: wrapped };
};

export const discloseMo = (a: APLArray): APLArray => {
  if (count(a) === 0) return scalar(0);
  const v = a.data[0];
  if (typeof v === "object") return v as APLArray;
  return scalar(v);
};

export const memberDy = (a: APLArray, b: APLArray): APLArray => {
  const memberOf = (v: APLScalar): 0 | 1 => {
    for (const x of b.data) if (eq(v, x)) return 1;
    return 0;
  };
  return { shape: [...a.shape], data: a.data.map(memberOf) };
};

export const uniqueMo = (a: APLArray): APLArray => {
  if (rank(a) > 1) throw RANK_ERROR("∪: rank ≤ 1");
  const seen: APLScalar[] = [];
  for (const v of a.data) if (!seen.some((s) => eq(s, v))) seen.push(v);
  return { shape: [seen.length], data: seen };
};

export const intersectDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) > 1 || rank(b) > 1) throw RANK_ERROR("∩: rank ≤ 1");
  const out: APLScalar[] = [];
  for (const v of a.data)
    if (b.data.some((x) => eq(x, v)) && !out.some((x) => eq(x, v)))
      out.push(v);
  return { shape: [out.length], data: out };
};

export const unionDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) > 1 || rank(b) > 1) throw RANK_ERROR("∪: rank ≤ 1");
  const out: APLScalar[] = [...a.data];
  for (const v of b.data) if (!out.some((x) => eq(x, v))) out.push(v);
  return { shape: [out.length], data: out };
};

export const gradeUpMo = (a: APLArray): APLArray => {
  if (rank(a) !== 1) throw RANK_ERROR("⍋: vector only");
  const idx = a.data.map((_, i) => i);
  idx.sort((i, j) => {
    const x = a.data[i];
    const y = a.data[j];
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x).localeCompare(String(y));
  });
  return { shape: [idx.length], data: idx.map((i) => i + 1) };
};

export const gradeDownMo = (a: APLArray): APLArray => {
  if (rank(a) !== 1) throw RANK_ERROR("⍒: vector only");
  const idx = a.data.map((_, i) => i);
  idx.sort((i, j) => {
    const x = a.data[i];
    const y = a.data[j];
    if (typeof x === "number" && typeof y === "number") return y - x;
    return String(y).localeCompare(String(x));
  });
  return { shape: [idx.length], data: idx.map((i) => i + 1) };
};

export const whereMo = (a: APLArray): APLArray => {
  if (rank(a) !== 1) throw RANK_ERROR("⍸: vector only");
  const out: number[] = [];
  for (let i = 0; i < a.data.length; i++) {
    const v = a.data[i];
    if (v === 1) out.push(i + 1);
    else if (v !== 0) throw DOMAIN_ERROR("⍸ requires boolean");
  }
  return { shape: [out.length], data: out };
};

export const formatMo = (a: APLArray): APLArray => {
  const s = a.data.map((v): string => {
    if (typeof v === "number") {
      if (v < 0) return "¯" + (-v).toString();
      return v.toString();
    }
    if (typeof v === "string") return v;
    return fmtArrayForCharOutput(v);
  });
  if (isScalar(a)) {
    const chars = s[0].split("");
    return { shape: [chars.length], data: chars };
  }
  const joined = s.join(" ");
  const chars = joined.split("");
  return { shape: [chars.length], data: chars };
};

const fmtArrayForCharOutput = (a: APLArray): string => {
  if (count(a) === 0) return "";
  const parts: string[] = [];
  for (const v of a.data) {
    if (typeof v === "number") {
      parts.push(v < 0 ? "¯" + (-v).toString() : v.toString());
    } else if (typeof v === "string") {
      parts.push(v);
    } else {
      parts.push(fmtArrayForCharOutput(v));
    }
  }
  return isScalar(a) ? parts[0] : parts.join(" ");
};

export const tackLeftMo = (a: APLArray): APLArray => a;
export const tackLeftDy = (a: APLArray, _b: APLArray): APLArray => a;
export const tackRightMo = (a: APLArray): APLArray => a;
export const tackRightDy = (_a: APLArray, b: APLArray): APLArray => b;

export const pickDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) > 1) throw RANK_ERROR("⌷: index scalar or vector");
  const idx = numericOnly(a).map((v) => asInt(v));
  if (idx.length > rank(b)) throw RANK_ERROR("⌷: too many indices");
  let shape = [...b.shape];
  let stride = count(b);
  let offset = 0;
  for (let dim = 0; dim < idx.length; dim++) {
    const dimSize = shape[0];
    stride = stride / dimSize;
    const i = idx[dim] - 1;
    if (i < 0 || i >= dimSize) throw INDEX_ERROR("⌷");
    offset += i * stride;
    shape = shape.slice(1);
  }
  const len = shape.reduce((p, c) => p * c, 1);
  return { shape, data: b.data.slice(offset, offset + len) };
};

export const decodeDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) > 1 || rank(b) > 1) throw RANK_ERROR("⊥: vectors only");
  const bases = numericOnly(a);
  const digits = numericOnly(b);
  if (bases.length !== digits.length && bases.length !== 1)
    throw LENGTH_ERROR("⊥");
  let total = 0;
  if (bases.length === 1) {
    const base = bases[0];
    for (const d of digits) total = total * base + d;
  } else {
    let mult = 1;
    for (let i = digits.length - 1; i >= 0; i--) {
      total += digits[i] * mult;
      mult *= bases[i];
    }
  }
  return scalar(total);
};

export const encodeDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) > 1 || !isScalar(b)) throw RANK_ERROR("⊤: vector left, scalar right");
  const bases = numericOnly(a);
  let n = asInt(b.data[0]);
  const out: number[] = new Array(bases.length);
  for (let i = bases.length - 1; i >= 0; i--) {
    if (bases[i] === 0) {
      out[i] = n;
      n = 0;
    } else {
      out[i] = ((n % bases[i]) + bases[i]) % bases[i];
      n = Math.trunc((n - out[i]) / bases[i]);
    }
  }
  return { shape: [bases.length], data: out };
};

export const matInvMo = (a: APLArray): APLArray => {
  if (isScalar(a)) return divideMo(a);
  if (rank(a) === 2 && a.shape[0] === a.shape[1] && a.shape[0] === 2) {
    const [aa, b, c, d] = numericOnly(a);
    const det = aa * d - b * c;
    if (det === 0) throw DOMAIN_ERROR("singular matrix");
    return {
      shape: [2, 2],
      data: [d / det, -b / det, -c / det, aa / det],
    };
  }
  throw DOMAIN_ERROR("⌹: only scalar or 2x2 supported");
};

export const findDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) !== 1 || rank(b) !== 1)
    throw RANK_ERROR("⍷: vectors only");
  const out: number[] = new Array(b.data.length).fill(0);
  for (let i = 0; i + a.data.length <= b.data.length; i++) {
    let ok = true;
    for (let j = 0; j < a.data.length; j++) {
      if (!eq(a.data[j], b.data[i + j])) {
        ok = false;
        break;
      }
    }
    if (ok) out[i] = 1;
  }
  return { shape: [b.data.length], data: out };
};

export const replicateDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) > 1 || rank(b) > 1) throw RANK_ERROR("/: vectors only");
  const counts = numericOnly(a).map((v) => asInt(v));
  const src = b.data;
  const n = src.length;
  let mask: number[];
  if (counts.length === 1) mask = new Array(n).fill(counts[0]);
  else mask = counts;
  if (mask.length !== n) throw LENGTH_ERROR("/");
  const out: APLScalar[] = [];
  for (let i = 0; i < n; i++) {
    const k = mask[i];
    if (k < 0) for (let j = 0; j < -k; j++) out.push(fillOf(b));
    else for (let j = 0; j < k; j++) out.push(src[i]);
  }
  return { shape: [out.length], data: out };
};

export const expandDy = (a: APLArray, b: APLArray): APLArray => {
  if (rank(a) > 1 || rank(b) > 1) throw RANK_ERROR("\\: vectors only");
  const mask = numericOnly(a).map((v) => asInt(v));
  const out: APLScalar[] = [];
  let bi = 0;
  for (const m of mask) {
    if (m === 1) {
      if (bi >= b.data.length) throw LENGTH_ERROR("\\: too few values");
      out.push(b.data[bi++]);
    } else if (m === 0) {
      out.push(fillOf(b));
    } else throw DOMAIN_ERROR("\\: boolean mask required");
  }
  if (bi !== b.data.length) throw LENGTH_ERROR("\\: extra values");
  return { shape: [out.length], data: out };
};
