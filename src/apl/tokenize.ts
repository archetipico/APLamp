/**
 * APL tokenizer.
 * Handles numbers (with high-minus ¯), strings 'like ''this''',
 * identifiers, glyphs, parentheses, brackets, ←, ⋄.
 */
import { ALL_GLYPH_CHARS } from "./registry";

export type TokenKind =
  | "number"
  | "string"
  | "name"
  | "glyph"
  | "assign"
  | "lparen"
  | "rparen"
  | "lbracket"
  | "rbracket"
  | "diamond"
  | "semicolon"
  | "newline";

export interface Token {
  kind: TokenKind;
  value: string;
  pos: number;
}

const isDigit = (ch: string) => ch >= "0" && ch <= "9";
const isAlpha = (ch: string) =>
  (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
const isAlnum = (ch: string) => isAlpha(ch) || isDigit(ch);

/** Tokenizer-only extras: brace characters used by dfns and the special names. */
const BRACE_CHARS = new Set(["{", "}"]);
const SPECIAL_NAMES = new Set(["⍵", "⍺", "⎕", "⍬", "⍞"]);

const isGlyphChar = (ch: string) =>
  ALL_GLYPH_CHARS.has(ch) || BRACE_CHARS.has(ch);

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === "\n") {
      out.push({ kind: "newline", value: "\n", pos: i });
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }
    if (c === "⍝") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "⋄") {
      out.push({ kind: "diamond", value: "⋄", pos: i });
      i++;
      continue;
    }
    if (c === "(") {
      out.push({ kind: "lparen", value: "(", pos: i });
      i++;
      continue;
    }
    if (c === ")") {
      out.push({ kind: "rparen", value: ")", pos: i });
      i++;
      continue;
    }
    if (c === "[") {
      out.push({ kind: "lbracket", value: "[", pos: i });
      i++;
      continue;
    }
    if (c === "]") {
      out.push({ kind: "rbracket", value: "]", pos: i });
      i++;
      continue;
    }
    if (c === ";") {
      out.push({ kind: "semicolon", value: ";", pos: i });
      i++;
      continue;
    }
    if (c === "←") {
      out.push({ kind: "assign", value: "←", pos: i });
      i++;
      continue;
    }
    if (c === "'") {
      const start = i;
      i++;
      let s = "";
      while (i < src.length) {
        if (src[i] === "'") {
          if (src[i + 1] === "'") {
            s += "'";
            i += 2;
            continue;
          }
          i++;
          out.push({ kind: "string", value: s, pos: start });
          break;
        }
        s += src[i];
        i++;
      }
      continue;
    }
    if (c === "¯" || isDigit(c) || (c === "." && isDigit(src[i + 1] ?? ""))) {
      const start = i;
      let s = "";
      if (c === "¯") {
        s += "-";
        i++;
      }
      while (
        i < src.length &&
        (isDigit(src[i]) ||
          src[i] === "." ||
          src[i] === "e" ||
          src[i] === "E" ||
          ((src[i] === "+" || src[i] === "-" || src[i] === "¯") &&
            (src[i - 1] === "e" || src[i - 1] === "E")))
      ) {
        if (src[i] === "¯") s += "-";
        else s += src[i];
        i++;
      }
      out.push({ kind: "number", value: s, pos: start });
      continue;
    }
    if (SPECIAL_NAMES.has(c)) {
      const start = i;
      let s = c;
      i++;
      // Consume alphanumeric suffix to support quad names like ⎕IO, ⎕A, ⎕TS.
      if (c === "⎕") {
        let suffix = "";
        while (i < src.length && isAlnum(src[i])) {
          suffix += src[i];
          i++;
        }
        if (suffix) s = "⎕" + suffix.toUpperCase();
      }
      out.push({ kind: "name", value: s, pos: start });
      continue;
    }
    if (isAlpha(c)) {
      const start = i;
      let s = "";
      while (i < src.length && isAlnum(src[i])) {
        s += src[i];
        i++;
      }
      out.push({ kind: "name", value: s, pos: start });
      continue;
    }
    if (isGlyphChar(c)) {
      out.push({ kind: "glyph", value: c, pos: i });
      i++;
      continue;
    }
    throw new Error(`SYNTAX ERROR: unexpected character "${c}" at ${i}`);
  }
  return out;
}
