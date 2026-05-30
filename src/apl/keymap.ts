/**
 * Physical-key to APL glyph mapping, indexed by KeyboardEvent.code so
 * resolution is independent of the OS keyboard layout. Two tables: bare
 * keys and shift-modified keys. Only keys with an APL shift glyph are
 * intercepted on Shift; keys without one keep their native character.
 */

export const BARE_BY_CODE: Readonly<Record<string, string>> = {
  Backquote: "⋄",
  Digit1: "¨",
  Digit2: "¯",
  Digit3: "<",
  Digit4: ">",
  Digit5: "=",
  Digit6: "∧",
  Digit7: "∨",
  Digit8: "×",
  Digit9: "*",
  Digit0: "!",
  Minus: "⌈",
  Equal: "⌽",

  KeyQ: "⍵",
  KeyW: "⍴",
  KeyE: "∊",
  KeyR: "⍳",
  KeyT: "↑",
  KeyY: "⊂",
  KeyU: "⊥",
  KeyI: "⊣",
  KeyO: "⍋",
  KeyP: "○",
  BracketLeft: "←",
  BracketRight: "⍪",

  KeyA: "/",
  KeyS: "\\",
  KeyD: "∘",
  KeyF: ".",
  KeyG: "∇",
  KeyH: "~",
  KeyJ: "⌹",
  KeyK: "⍕",
  KeyL: "⎕",

  KeyZ: "⍉",
  KeyX: "∪",
  KeyC: ",",
  KeyV: "_",
  KeyB: "'",
  KeyN: "|",
};

export const SHIFT_BY_CODE: Readonly<Record<string, string>> = {
  Backquote: "⍝",
  Digit1: "⍨",
  Digit3: "≤",
  Digit4: "≥",
  Digit5: "≠",
  Digit6: "⍲",
  Digit7: "⍱",
  Digit8: "÷",
  Digit9: "⍟",
  Digit0: "?",
  Minus: "⌊",
  Equal: "⊖",

  KeyQ: "⍺",
  KeyE: "⍷",
  KeyR: "⍸",
  KeyT: "↓",
  KeyY: "⊃",
  KeyU: "⊤",
  KeyI: "⊢",
  KeyO: "⍒",
  BracketLeft: "{",
  BracketRight: "}",

  KeyA: "⌿",
  KeyS: "⍀",
  KeyG: "∆",
  KeyK: "⍎",
  KeyL: "⌷",

  KeyX: "∩",
};

/** Resolve a physical key event to an APL glyph, or undefined if there isn't one. */
export function resolveAplKey(
  code: string,
  shift: boolean
): string | undefined {
  if (shift) {
    return SHIFT_BY_CODE[code] ?? BARE_BY_CODE[code];
  }
  return BARE_BY_CODE[code];
}
