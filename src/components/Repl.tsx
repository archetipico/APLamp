import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { newSession, runLine, type APLSession } from "@/apl";
import { resolveAplKey } from "@/apl/keymap";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Eraser, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkRateLimit } from "@/lib/guardian";
import { ConsoleBand } from "@/components/ConsoleBand";

export interface ReplEntry {
  id: number;
  input: string;
  outputs: { text: string; isError: boolean }[];
}

export interface ReplHandle {
  insertAtCursor: (s: string) => void;
  setInput: (s: string) => void;
  focus: () => void;
}

interface ReplProps {
  className?: string;
}

type Notice = { kind: "paste" | "rate" | "bot"; until: number } | null;

const NOTICE_MS = 10000;

export const Repl = forwardRef<ReplHandle, ReplProps>(function Repl(
  { className },
  ref
) {
  const { t } = useTranslation();
  const [session] = useState<APLSession>(() => newSession());
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<ReplEntry[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [aplMode, setAplMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("apl.inputMode");
    return stored === null ? false : stored === "apl";
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior });
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
    const max = lh * 6 + 8;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [input]);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [entries.length]);

  const showNotice = (kind: NonNullable<Notice>["kind"]) => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNotice({ kind, until: Date.now() + NOTICE_MS });
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const toggleMode = () => {
    setAplMode((v) => {
      const next = !v;
      window.localStorage.setItem("apl.inputMode", next ? "apl" : "ascii");
      return next;
    });
    textareaRef.current?.focus();
  };

  const insertGlyph = (s: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setInput((v) => v + s);
      return;
    }
    const start = ta.selectionStart ?? input.length;
    const end = ta.selectionEnd ?? input.length;
    setInput((curr) => curr.slice(0, start) + s + curr.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + s.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  useImperativeHandle(ref, () => ({
    insertAtCursor: insertGlyph,
    setInput: (s) => {
      setInput(s);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(s.length, s.length);
      });
    },
    focus: () => textareaRef.current?.focus(),
  }));

  const run = () => {
    if (honeypotRef.current && honeypotRef.current.value.length > 0) {
      showNotice("bot");
      return;
    }
    const rl = checkRateLimit();
    if (!rl.allowed) {
      showNotice("rate");
      return;
    }
    const src = input.trim();
    if (!src) return;
    const results = runLine(src, session);
    const outputs = results.map((r) => ({ text: r.output, isError: r.isError }));
    const next: ReplEntry = { id: ++idRef.current, input: src, outputs };
    setEntries((es) => [...es, next]);
    setInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "Shift" ||
      e.key === "Alt" ||
      e.key === "Control" ||
      e.key === "Meta"
    ) {
      return;
    }

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const glyph = resolveAplKey(e.code, e.shiftKey);
      if (glyph) {
        e.preventDefault();
        insertGlyph(glyph);
        return;
      }
    }

    if (aplMode && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const glyph = resolveAplKey(e.code, e.shiftKey);
      if (glyph) {
        e.preventDefault();
        insertGlyph(glyph);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      run();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    showNotice("paste");
  };

  const onBeforeInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const native = e.nativeEvent as InputEvent;
    const type = native.inputType || "";
    if (type.startsWith("insertFrom") || type === "insertReplacementText") {
      e.preventDefault();
      showNotice("paste");
    }
  };

  const onContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    showNotice("paste");
  };

  const clear = () => {
    setEntries([]);
    setInput("");
    textareaRef.current?.focus();
  };

  const noticeText = notice
    ? notice.kind === "paste"
      ? t("guardian.pasteBlocked")
      : notice.kind === "rate"
        ? t("guardian.rateLimited")
        : t("guardian.botDetected")
    : "";

  return (
    <div
      className={cn(
        "chassis flex flex-col h-full bg-card border border-foreground/85",
        className
      )}
    >
      <ConsoleBand
        label="Repl"
        actions={
          <>
            <button
              type="button"
              onClick={toggleMode}
              aria-pressed={aplMode}
              className={cn(
                "hidden sm:inline-flex text-[10px] uppercase tracking-[0.22em] font-mono px-2 py-1 border transition-colors",
                aplMode
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-foreground/25 hover:text-foreground hover:border-foreground"
              )}
              title={t("workbench.inputModeTitle")}
            >
              {aplMode ? t("workbench.modeApl") : t("workbench.modeAscii")}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              aria-label={t("workbench.clear")}
              className="folio gap-1.5 -my-1 -mr-1"
            >
              <Eraser className="size-3.5" />
              <span className="hidden sm:inline">{t("workbench.clear")}</span>
            </Button>
          </>
        }
      />

      <ScrollArea
        viewportRef={viewportRef}
        className="flex-1 px-4 sm:px-5 py-4"
      >
        <div className="font-mono text-sm leading-relaxed">
          {entries.length === 0 ? (
            <p className="marginalia">{t("workbench.historyEmpty")}</p>
          ) : (
            entries.map((e) => <ReplEntryView key={e.id} entry={e} />)
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-foreground/85 px-4 sm:px-5 py-3 sm:py-4 bg-background">
        {notice && (
          <div
            role="alert"
            className="mb-3 px-3 py-2 border border-[hsl(var(--ember))] text-[hsl(var(--ember))] font-sans text-xs leading-snug flex items-start gap-3"
          >
            <span className="flex-1">{noticeText}</span>
            <button
              type="button"
              onClick={() => {
                if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
                setNotice(null);
              }}
              aria-label={t("guardian.dismiss")}
              className="shrink-0 px-1.5 leading-none text-[hsl(var(--ember))] hover:opacity-70"
            >
              ✕
            </button>
          </div>
        )}
        <input
          ref={honeypotRef}
          type="text"
          name="email"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          defaultValue=""
          style={{
            position: "absolute",
            left: "-9999px",
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
        <div className="flex gap-3 items-center">
          <span className="shrink-0 self-center select-none font-mono text-base leading-snug text-[hsl(var(--ember))]">
            ›
          </span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              const next = e.target.value;
              if (next.length - input.length > 1) {
                showNotice("paste");
                return;
              }
              setInput(next);
            }}
            onBeforeInput={onBeforeInput}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onDrop={onDrop}
            onContextMenu={onContextMenu}
            placeholder={t("workbench.placeholder")}
            rows={1}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 bg-transparent resize-none outline-none overflow-y-auto font-mono text-base leading-snug placeholder:font-mono placeholder:not-italic placeholder:text-muted-foreground/60"
          />
          <Button
            onClick={run}
            size="sm"
            variant="default"
            className="shrink-0 self-center h-9 sm:h-8 px-3"
            disabled={input.trim().length === 0}
            aria-label={t("workbench.run")}
          >
            <Play className="size-4" />
            <span className="hidden sm:inline">{t("workbench.run")}</span>
          </Button>
        </div>
        <p className="folio mt-2.5 hidden sm:block">{t("workbench.runHint")}</p>
        <p className="mt-1.5 text-[12px] font-sans text-foreground/70 leading-snug hidden sm:block">
          {aplMode
            ? t("workbench.aplKeyHintOn")
            : t("workbench.aplKeyHintOff")}
        </p>
      </div>
    </div>
  );
});

function ReplEntryView({ entry }: { entry: ReplEntry }) {
  return (
    <div className="mb-5 animate-ink-bleed">
      <div className="flex gap-3">
        <span className="text-[hsl(var(--ember))] shrink-0 select-none">›</span>
        <pre className="whitespace-pre-wrap break-words text-foreground">
          {entry.input}
        </pre>
      </div>
      <div className="mt-1 pl-5 border-l border-foreground/15 ml-[5px]">
        {entry.outputs.map((o, i) => (
          <pre
            key={i}
            className={cn(
              "whitespace-pre-wrap break-words pl-3 py-0.5",
              o.isError
                ? "text-[hsl(var(--rust))] font-serif italic"
                : "phosphor"
            )}
          >
            {o.isError ? `※ ${o.text}` : o.text}
          </pre>
        ))}
      </div>
    </div>
  );
}
