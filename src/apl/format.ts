import type { APLArray, APLScalar } from "./types";
import { count, isScalar, rank } from "./types";

const fmtNum = (n: number): string => {
  if (Number.isNaN(n)) return "NaN";
  if (!Number.isFinite(n)) return n > 0 ? "∞" : "¯∞";
  if (Object.is(n, -0)) return "0";
  const s = n < 0 ? "¯" + String(-n) : String(n);
  return s;
};

const boxed = (s: string): string => {
  const lines = s.split("\n");
  const w = Math.max(0, ...lines.map((l) => l.length));
  const top = "┌" + "─".repeat(w) + "┐";
  const bot = "└" + "─".repeat(w) + "┘";
  const body = lines.map((l) => "│" + l + " ".repeat(w - l.length) + "│");
  return [top, ...body, bot].join("\n");
};

const fmtScalar = (v: APLScalar): string => {
  if (typeof v === "number") return fmtNum(v);
  if (typeof v === "string") return v;
  return boxed(format(v));
};

const cellStrings = (a: APLArray): string[] =>
  a.data.map((v) => fmtScalar(v));

/** Format an APL array using right-aligned columns, similar to Dyalog */
export const format = (a: APLArray): string => {
  if (count(a) === 0) {
    if (rank(a) === 0) return "";
    return "";
  }
  if (isScalar(a)) return fmtScalar(a.data[0]);
  const cells = cellStrings(a);
  const r = rank(a);
  if (r === 1) {
    const allChars = a.data.every((x) => typeof x === "string");
    if (allChars) return cells.join("");
    return cells.join(" ");
  }
  if (r === 2) {
    const [rows, cols] = a.shape;
    const widths: number[] = new Array(cols).fill(0);
    for (let c = 0; c < cols; c++) {
      for (let r2 = 0; r2 < rows; r2++) {
        const cell = cells[r2 * cols + c];
        if (cell.length > widths[c]) widths[c] = cell.length;
      }
    }
    const allChars = a.data.every((x) => typeof x === "string");
    const lines: string[] = [];
    for (let r2 = 0; r2 < rows; r2++) {
      const parts: string[] = [];
      for (let c = 0; c < cols; c++) {
        const cell = cells[r2 * cols + c];
        const pad = " ".repeat(widths[c] - cell.length);
        parts.push(allChars ? cell : pad + cell);
      }
      lines.push(allChars ? parts.join("") : parts.join(" "));
    }
    return lines.join("\n");
  }
  // Rank >= 3: flatten last two dims into matrices separated by blank lines.
  const shp = a.shape;
  const last2 = shp[r - 1] * shp[r - 2];
  const planes: string[] = [];
  const planeCount = count(a) / last2;
  for (let p = 0; p < planeCount; p++) {
    const data = a.data.slice(p * last2, (p + 1) * last2);
    planes.push(
      format({ shape: [shp[r - 2], shp[r - 1]], data })
    );
  }
  return planes.join("\n\n");
};
