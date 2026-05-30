/**
 * Core data types for the APL interpreter.
 * APL values are multi-dimensional arrays with a shape and a flat data buffer
 * stored in row-major order.
 */

export type APLScalar = number | string | APLArray;

export interface APLArray {
  shape: number[];
  data: APLScalar[];
}

export const isScalar = (a: APLArray): boolean => a.shape.length === 0;
export const isVector = (a: APLArray): boolean => a.shape.length === 1;
export const isMatrix = (a: APLArray): boolean => a.shape.length === 2;

export const isNested = (v: APLScalar): v is APLArray =>
  typeof v === "object" && v !== null && Array.isArray((v as APLArray).shape);

export const rank = (a: APLArray): number => a.shape.length;
export const count = (a: APLArray): number =>
  a.shape.reduce((p, c) => p * c, 1);

export const scalar = (v: APLScalar): APLArray => ({ shape: [], data: [v] });
export const vector = (vs: APLScalar[]): APLArray => ({
  shape: [vs.length],
  data: [...vs],
});
export const empty = (): APLArray => ({ shape: [0], data: [] });

export class APLError extends Error {
  kind: string;
  constructor(kind: string, message: string) {
    super(message);
    this.kind = kind;
    this.name = "APLError";
  }
}

export const DOMAIN_ERROR = (m = "DOMAIN ERROR") =>
  new APLError("DOMAIN", m);
export const LENGTH_ERROR = (m = "LENGTH ERROR") =>
  new APLError("LENGTH", m);
export const RANK_ERROR = (m = "RANK ERROR") => new APLError("RANK", m);
export const INDEX_ERROR = (m = "INDEX ERROR") => new APLError("INDEX", m);
export const SYNTAX_ERROR = (m = "SYNTAX ERROR") =>
  new APLError("SYNTAX", m);
export const VALUE_ERROR = (m = "VALUE ERROR") => new APLError("VALUE", m);
export const NONCE_ERROR = (m = "NONCE ERROR") => new APLError("NONCE", m);
