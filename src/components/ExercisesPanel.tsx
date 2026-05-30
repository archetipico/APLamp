import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { EXERCISES, type Difficulty } from "@/data/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExplanationContent } from "@/components/ExplanationContent";

const DIFFS: (Difficulty | "all")[] = ["all", "easy", "medium", "hard"];

interface ExercisesPanelProps {
  onSendToRepl: (code: string) => void;
  className?: string;
}

export interface ExercisesPanelHandle {
  resetScroll: () => void;
}

export const ExercisesPanel = forwardRef<
  ExercisesPanelHandle,
  ExercisesPanelProps
>(function ExercisesPanel({ onSendToRepl, className }, ref) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const viewportRef = useRef<HTMLDivElement>(null);

  const resetScroll = () => {
    viewportRef.current?.scrollTo({ top: 0 });
  };

  useImperativeHandle(ref, () => ({ resetScroll }));

  useEffect(() => {
    resetScroll();
  }, [diff, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (diff !== "all" && e.difficulty !== diff) return false;
      if (!q) return true;
      const title = t(`${e.slug}.title`, { ns: "exercises" }).toLowerCase();
      const prompt = t(`${e.slug}.prompt`, { ns: "exercises" }).toLowerCase();
      return (
        title.includes(q) ||
        prompt.includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.topic.includes(q)
      );
    });
  }, [query, diff, t]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3">
        <div>
          <h2 className="title-console text-xl">
            {t("exercises.title")}
          </h2>
          <p className="marginalia mt-2">{t("exercises.intro")}</p>
        </div>
        <Input
          placeholder={t("exercises.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {DIFFS.map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={cn("chip", diff === d ? "chip-on" : "chip-off")}
            >
              {d === "all"
                ? t("exercises.difficultyAll")
                : t(`exercises.diff.${d}`)}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea viewportRef={viewportRef} className="flex-1">
        <ol>
          {filtered.map((e) => (
            <li
              key={e.id}
              className="glyph-row border-b border-foreground/10 px-4 sm:px-5 py-4 last:border-b-0"
            >
              <header className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                <span className="folio shrink-0">
                  № {String(e.id).padStart(3, "0")}
                </span>
                <h3 className="title-console-sm text-[15px] flex-1">
                  {t(`${e.slug}.title`, { ns: "exercises" })}
                </h3>
                <DifficultyBadge difficulty={e.difficulty} />
              </header>
              <p className="text-[13px] mt-2 text-foreground/90 leading-snug">
                {t(`${e.slug}.prompt`, { ns: "exercises" })}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRevealed((r) => ({ ...r, [e.id]: !r[e.id] }))
                  }
                >
                  {revealed[e.id] ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                  {revealed[e.id]
                    ? t("exercises.hideSolution")
                    : t("exercises.showSolution")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onSendToRepl(e.code)}
                >
                  <Send className="size-3.5" />
                  {t("exercises.run")}
                </Button>
              </div>

              {revealed[e.id] && (
                <div className="mt-4 space-y-4 animate-ink-bleed">
                  <section>
                    <div className="folio mb-1.5">
                      {t("exercises.solutionLabel")}
                    </div>
                    <pre
                      className="font-mono text-[13px] bg-background border border-foreground/85 px-3 py-2.5 whitespace-pre-wrap break-words"
                      style={{ boxShadow: "3px 3px 0 hsl(var(--ember))" }}
                    >
                      {e.code}
                    </pre>
                  </section>

                  <section>
                    <div className="folio mb-1.5">
                      {t("exercises.outputLabel")}
                    </div>
                    <pre
                      className="font-mono text-[13px] bg-foreground/[0.04] border border-foreground/30 border-l-2 border-l-[hsl(var(--ember))] px-3 py-2.5 whitespace-pre overflow-x-auto"
                    >
                      {t(`${e.slug}.result`, { ns: "exercises" })}
                    </pre>
                  </section>

                  <section>
                    <div className="folio mb-1.5">
                      {t("exercises.reasoningLabel")}
                    </div>
                    <div className="text-[13px] text-foreground/90 leading-relaxed">
                      <ExplanationContent
                        text={t(`${e.slug}.explanation`, { ns: "exercises" })}
                      />
                    </div>
                  </section>
                </div>
              )}
            </li>
          ))}
        </ol>
      </ScrollArea>
    </div>
  );
});

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useTranslation();
  const styles: Record<Difficulty, string> = {
    easy: "border-foreground/40 text-muted-foreground",
    medium: "border-[hsl(var(--gilt))] text-[hsl(var(--gilt))]",
    hard: "border-[hsl(var(--ember))] text-[hsl(var(--ember))]",
  };
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-[0.22em] font-mono px-2 py-0.5 border",
        styles[difficulty]
      )}
    >
      {t(`exercises.diff.${difficulty}`)}
    </span>
  );
}
