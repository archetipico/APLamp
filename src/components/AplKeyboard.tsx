import { useState } from "react";
import { useTranslation } from "react-i18next";
import { findByGlyph, REGISTRY } from "@/apl/registry";
import { cn } from "@/lib/utils";
import { ConsoleBand } from "@/components/ConsoleBand";

/**
 * APL keyboard, Dyalog layout.
 *
 * Each cell exposes a bare button covering the whole cell and an optional
 * shift button in the top-right corner. Buttons are siblings, not nested,
 * so each owns its own hover area and tooltip. The ASCII character of the
 * physical key is drawn as a label in the top-left.
 */

interface Key {
  ascii: string;
  bare?: string;
  shift?: string;
}

interface KeyboardRow {
  indent: number;
  keys: Key[];
}

/**
 * Layout is organized so paired primitives sit on the same physical key.
 * Bare glyph is the primary action; shift glyph is the related counterpart.
 * Keys with no APL mapping (`;` `,` `.` `/` `\` `'`) stay free for native
 * typing so the user can still produce ASCII characters from their keyboard.
 *
 * `indent` is in cell-width fractions so the stagger scales with the
 * responsive `--kbd-size` CSS variable.
 */
const ROWS: KeyboardRow[] = [
  {
    indent: 0,
    keys: [
      { ascii: "`", bare: "⋄", shift: "⍝" },
      { ascii: "1", bare: "¨", shift: "⍨" },
      { ascii: "2", bare: "¯", shift: "⍞" },
      { ascii: "3", bare: "<", shift: "≤" },
      { ascii: "4", bare: ">", shift: "≥" },
      { ascii: "5", bare: "=", shift: "≠" },
      { ascii: "6", bare: "∧", shift: "⍲" },
      { ascii: "7", bare: "∨", shift: "⍱" },
      { ascii: "8", bare: "×", shift: "÷" },
      { ascii: "9", bare: "*", shift: "⍟" },
      { ascii: "0", bare: "!", shift: "?" },
      { ascii: "-", bare: "⌈", shift: "⌊" },
      { ascii: "=", bare: "⌽", shift: "⊖" },
    ],
  },
  {
    indent: 0.5,
    keys: [
      { ascii: "Q", bare: "⍵", shift: "⍺" },
      { ascii: "W", bare: "⍴", shift: "⍬" },
      { ascii: "E", bare: "∊", shift: "⍷" },
      { ascii: "R", bare: "⍳", shift: "⍸" },
      { ascii: "T", bare: "↑", shift: "↓" },
      { ascii: "Y", bare: "⊂", shift: "⊃" },
      { ascii: "U", bare: "⊥", shift: "⊤" },
      { ascii: "I", bare: "⊣", shift: "⊢" },
      { ascii: "O", bare: "⍋", shift: "⍒" },
      { ascii: "P", bare: "○", shift: "⍣" },
      { ascii: "[", bare: "←", shift: "{" },
      { ascii: "]", bare: "⍪", shift: "}" },
    ],
  },
  {
    indent: 0.75,
    keys: [
      { ascii: "A", bare: "/", shift: "⌿" },
      { ascii: "S", bare: "\\", shift: "⍀" },
      { ascii: "D", bare: "∘", shift: "⍤" },
      { ascii: "F", bare: ".", shift: "@" },
      { ascii: "G", bare: "∇", shift: "∆" },
      { ascii: "H", bare: "~", shift: "⊆" },
      { ascii: "J", bare: "⌹", shift: "≢" },
      { ascii: "K", bare: "⍕", shift: "⍎" },
      { ascii: "L", bare: "⎕", shift: "⌷" },
    ],
  },
  {
    indent: 1.25,
    keys: [
      { ascii: "Z", bare: "⍉" },
      { ascii: "X", bare: "∪", shift: "∩" },
      { ascii: "C", bare: "," },
      { ascii: "V", bare: "_" },
      { ascii: "B", bare: "'" },
      { ascii: "N", bare: "|", shift: "≡" },
    ],
  },
];

interface AplKeyboardProps {
  onInsert: (s: string) => void;
  className?: string;
}

export function AplKeyboard({ onInsert, className }: AplKeyboardProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<string | null>(null);

  const nameOf = (g: string): string => {
    const entry = findByGlyph(g);
    if (entry) return t(`${entry.slug}.name`, { ns: "glyphs" });
    return g;
  };

  const isUnsupported = (g: string): boolean =>
    !!findByGlyph(g)?.unsupported;

  // Mobile keyboard groups every registry glyph by semantic category so
  // the layout mirrors the reference panel and the user always knows where
  // to look for a primitive.
  const CATEGORY_ORDER = [
    "arithmetic",
    "comparison",
    "logical",
    "structural",
    "selection",
    "operators",
    "misc",
  ] as const;
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    glyphs: REGISTRY.filter((e) => e.category === cat).map((e) => e.glyph),
  })).filter((s) => s.glyphs.length > 0);


  return (
    <section
      className={cn(
        "chassis bg-card border border-foreground/85",
        className
      )}
      role="group"
      aria-label={t("workbench.keyboardLabel")}
    >
      <ConsoleBand label="Keyboard" state="red" />

      {/* Mobile: grouped by category, every glyph its own tile, no shift, no tooltip */}
      <div className="sm:hidden px-3 pt-2 pb-3.5 space-y-3">
        {grouped.map(({ cat, glyphs }, i) => (
          <section key={cat}>
            <div className={cn("flex items-center gap-2 pb-1.5", i > 0 && "pt-1")}>
              <span className="folio">{t(`glyphs.cat.${cat}`)}</span>
              <span className="flex-1 h-px bg-foreground/15" aria-hidden />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5">
              {glyphs.map((g) => {
                const muted = isUnsupported(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onInsert(g)}
                    className={cn("kbd-tile apl-glyph", muted && "kbd-tile--muted")}
                    aria-label={nameOf(g)}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Desktop: Dyalog staggered layout, name shown statically in info row */}
      <div className="hidden sm:block kbd-scroll px-4 pt-3 pb-2">
        <div className="kbd-rows inline-flex flex-col gap-1 min-w-full">
          {ROWS.map((row, i) => (
            <div
              key={i}
              className="kbd-row flex gap-1"
              style={{ paddingLeft: `calc(var(--kbd-size) * ${row.indent})` }}
            >
              {row.keys.map((k) => (
                <KeyCell
                  key={k.ascii}
                  k={k}
                  onInsert={onInsert}
                  isUnsupported={isUnsupported}
                  onHover={setHovered}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        className="hidden sm:flex items-baseline gap-2 border-t border-foreground/15 px-4 py-1.5"
        aria-live="polite"
      >
        <span className={cn("apl-glyph text-base", !hovered && "invisible")}>
          {hovered ?? "X"}
        </span>
        <span className={cn("italic font-serif text-sm", !hovered && "invisible")}>
          {hovered ? nameOf(hovered) : "X"}
        </span>
      </div>
    </section>
  );
}

interface KeyCellProps {
  k: Key;
  onInsert: (s: string) => void;
  isUnsupported: (g: string) => boolean;
  onHover: (g: string | null) => void;
}

function KeyCell({ k, onInsert, isUnsupported, onHover }: KeyCellProps) {
  const bareUnsupported = k.bare ? isUnsupported(k.bare) : false;
  const shiftUnsupported = k.shift ? isUnsupported(k.shift) : false;
  const cellUnsupported =
    bareUnsupported && (!k.shift || shiftUnsupported);
  return (
    <div className={cn("kbd-cell", cellUnsupported && "kbd-cell--muted")}>
      <span className="kbd-ascii">{k.ascii}</span>

      {k.bare && (
        <button
          type="button"
          onClick={() => k.bare && onInsert(k.bare)}
          onMouseEnter={() => k.bare && onHover(k.bare)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => k.bare && onHover(k.bare)}
          onBlur={() => onHover(null)}
          className={cn("kbd-bare", bareUnsupported && "kbd-bare--muted")}
        >
          <span className="kbd-glyph apl-glyph">{k.bare}</span>
        </button>
      )}

      {k.shift && (
        <button
          type="button"
          onClick={() => k.shift && onInsert(k.shift)}
          onMouseEnter={() => k.shift && onHover(k.shift)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => k.shift && onHover(k.shift)}
          onBlur={() => onHover(null)}
          className={cn(
            "kbd-shift apl-glyph",
            shiftUnsupported && "kbd-shift--muted"
          )}
        >
          {k.shift}
        </button>
      )}
    </div>
  );
}
