import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const THEME_COOKIE = "mode";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function writeTheme(next: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", next === "dark");
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${oneYear}; samesite=strict`;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "dark" ? "#11141b" : "#ece2d0");
}

export function Header() {
  const { t } = useTranslation();
  const lang = i18n.language?.startsWith("it") ? "it" : "en";
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    writeTheme(theme);
  }, [theme]);

  return (
    <header className="border-b border-foreground/85 relative z-[3] bg-background shrink-0">
      <div className="container flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-4 min-w-0">
          <a
            href="https://archetipico.github.io"
            title={t("homeTitle")}
            aria-label={t("homeTitle")}
            className="font-mono text-[11px] tracking-[0.25em] uppercase px-2 py-1.5 min-h-[32px] inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors border border-foreground/20 hover:border-foreground/60"
          >
            <span aria-hidden>←</span>
            <span>{t("home")}</span>
          </a>
          <h1 className="wordmark text-base sm:text-lg md:text-xl truncate flex items-center gap-2">
            <span>{t("brand")}</span>
            <span className="apl-glyph wordmark-lamp font-normal">⍝</span>
          </h1>
          <span aria-hidden className="hidden md:inline h-4 w-px bg-foreground/30" />
          <p className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/65">
            {t("tagline")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <span aria-hidden className="h-4 w-px bg-foreground/25" />
          <LangToggle lang={lang} />
        </div>
      </div>
    </header>
  );
}

function LangToggle({ lang }: { lang: "en" | "it" }) {
  const set = (l: "en" | "it") => {
    if (l !== lang) i18n.changeLanguage(l);
  };
  return (
    <div className="font-mono text-[11px] tracking-[0.25em] uppercase flex items-center gap-1">
      <button
        onClick={() => set("en")}
        className={cn(
          "px-2 py-1.5 min-h-[32px] min-w-[32px] transition-colors",
          lang === "en"
            ? "text-foreground border-b border-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <span className="text-muted-foreground select-none">·</span>
      <button
        onClick={() => set("it")}
        className={cn(
          "px-2 py-1.5 min-h-[32px] min-w-[32px] transition-colors",
          lang === "it"
            ? "text-foreground border-b border-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={lang === "it"}
      >
        IT
      </button>
    </div>
  );
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="font-mono text-[11px] tracking-[0.25em] uppercase flex items-center gap-1"
      role="group"
      aria-label={t("theme.label")}
    >
      <button
        onClick={() => setTheme("light")}
        title={t("theme.light")}
        aria-label={t("theme.light")}
        aria-pressed={theme === "light"}
        className={cn(
          "px-2 py-1.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center gap-1 transition-colors",
          theme === "light"
            ? "text-foreground border-b border-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span aria-hidden className="text-[13px] leading-none">○</span>
        <span className="hidden sm:inline">LT</span>
      </button>
      <span className="text-muted-foreground select-none">·</span>
      <button
        onClick={() => setTheme("dark")}
        title={t("theme.dark")}
        aria-label={t("theme.dark")}
        aria-pressed={theme === "dark"}
        className={cn(
          "px-2 py-1.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center gap-1 transition-colors",
          theme === "dark"
            ? "text-foreground border-b border-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span aria-hidden className="text-[13px] leading-none">●</span>
        <span className="hidden sm:inline">DK</span>
      </button>
    </div>
  );
}
