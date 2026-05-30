import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { GLYPHS, type GlyphCategory } from "@/data/glyphs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

const CATEGORIES: (GlyphCategory | "all")[] = [
  "all",
  "arithmetic",
  "comparison",
  "logical",
  "structural",
  "selection",
  "operators",
  "misc",
];

interface GlyphPanelProps {
  onSendToRepl: (code: string) => void;
  className?: string;
}

export interface GlyphPanelHandle {
  resetScroll: () => void;
}

export const GlyphPanel = forwardRef<GlyphPanelHandle, GlyphPanelProps>(
  function GlyphPanel({ onSendToRepl, className }, ref) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<GlyphCategory | "all">("all");
  const viewportRef = useRef<HTMLDivElement>(null);

  const resetScroll = () => {
    viewportRef.current?.scrollTo({ top: 0 });
  };

  useImperativeHandle(ref, () => ({ resetScroll }));

  useEffect(() => {
    resetScroll();
  }, [cat, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLYPHS.filter((g) => {
      if (cat !== "all" && g.category !== cat) return false;
      if (!q) return true;
      const name = t(`${g.slug}.name`, { ns: "glyphs" }).toLowerCase();
      return (
        g.glyph.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q) ||
        name.includes(q) ||
        g.category.includes(q)
      );
    });
  }, [query, cat, t]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3">
        <div>
          <h2 className="title-console text-xl">
            {t("glyphs.title")}
          </h2>
          <p className="marginalia mt-2">{t("glyphs.intro")}</p>
        </div>
        <Input
          placeholder={t("glyphs.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn("chip", cat === c ? "chip-on" : "chip-off")}
            >
              {c === "all"
                ? t("glyphs.categoryAll")
                : t(`glyphs.cat.${c}`)}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea viewportRef={viewportRef} className="flex-1">
        <ul>
          {filtered.map((g) => {
            const name = t(`${g.slug}.name`, { ns: "glyphs" });
            const hasMonadic = !!g.monadicExamples?.length;
            const hasDyadic = !!g.dyadicExamples?.length;
            const monTitle = hasMonadic
              ? t(`${g.slug}.monadic.title`, {
                  ns: "glyphs",
                  defaultValue: "",
                })
              : "";
            const monDesc = hasMonadic
              ? t(`${g.slug}.monadic.desc`, { ns: "glyphs", defaultValue: "" })
              : "";
            const dyTitle = hasDyadic
              ? t(`${g.slug}.dyadic.title`, {
                  ns: "glyphs",
                  defaultValue: "",
                })
              : "";
            const dyDesc = hasDyadic
              ? t(`${g.slug}.dyadic.desc`, { ns: "glyphs", defaultValue: "" })
              : "";
            return (
              <li
                key={g.slug}
                className="glyph-row border-b border-foreground/10 px-4 sm:px-5 py-4 sm:py-5 last:border-b-0"
              >
                <div className="flex items-start gap-3 sm:gap-5">
                  <div className="specimen apl-glyph shrink-0 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl">
                    {g.glyph}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h3 className="title-console-sm text-base">
                        {name}
                      </h3>
                      <span className="folio">{t(`glyphs.cat.${g.category}`)}</span>
                      {g.unsupported && (
                        <span className="text-[10px] uppercase tracking-[0.2em] font-mono px-1.5 py-0.5 border border-[hsl(var(--ember))] text-[hsl(var(--ember))]">
                          {t("workbench.notImplemented")}
                        </span>
                      )}
                    </div>

                    {hasMonadic && (
                      <ArityBlock
                        kind="monadic"
                        title={monTitle}
                        desc={monDesc}
                      >
                        {g.monadicExamples?.map((ex, i) => (
                          <ExampleRow
                            key={`m-${i}`}
                            expr={ex.expr}
                            result={ex.result}
                            note={
                              ex.hasNote
                                ? t(`${g.slug}.exampleNotes.mo${i}`, {
                                    ns: "glyphs",
                                    defaultValue: "",
                                  })
                                : undefined
                            }
                            onSendToRepl={onSendToRepl}
                          />
                        ))}
                      </ArityBlock>
                    )}

                    {hasDyadic && (
                      <ArityBlock
                        kind="dyadic"
                        title={dyTitle}
                        desc={dyDesc}
                      >
                        {g.dyadicExamples?.map((ex, i) => (
                          <ExampleRow
                            key={`d-${i}`}
                            expr={ex.expr}
                            result={ex.result}
                            onSendToRepl={onSendToRepl}
                          />
                        ))}
                      </ArityBlock>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
});

function ArityBlock({
  kind,
  title,
  desc,
  children,
}: {
  kind: "monadic" | "dyadic";
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="mt-3.5">
      <h4 className="flex items-baseline gap-2">
        <span className="folio">
          {t(kind === "monadic" ? "glyphs.monadicHeader" : "glyphs.dyadicHeader")}
        </span>
        <span className="font-sans font-semibold text-[13px]">
          {title}
        </span>
      </h4>
      <p className="text-[13px] mt-1 text-foreground/85 leading-snug">
        {desc}
      </p>
      <div className="mt-2.5 space-y-2">{children}</div>
    </section>
  );
}

function ExampleRow({
  expr,
  result,
  note,
  onSendToRepl,
}: {
  expr: string;
  result: string;
  note?: string;
  onSendToRepl: (s: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="group">
      <div className="flex items-stretch border border-foreground/40">
        <code className="font-mono text-[13px] flex-1 px-2.5 py-1.5 text-foreground bg-background">
          {expr}
        </code>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-none border-l border-foreground/40 h-auto px-2 opacity-60 group-hover:opacity-100 transition-opacity"
          onClick={() => onSendToRepl(expr)}
          aria-label={t("workbench.sendToRepl")}
          title={t("workbench.sendToRepl")}
        >
          <Send className="size-3.5" />
        </Button>
      </div>
      <pre className="mt-1 pl-3 border-l-2 border-[hsl(var(--rust))] phosphor font-mono text-[12px] whitespace-pre-wrap leading-snug py-0.5">
        {result}
      </pre>
      {note && <p className="marginalia text-[12px] mt-1">{note}</p>}
    </div>
  );
}
