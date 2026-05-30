import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { GATE_PASSED_KEY, detectHeadless } from "@/lib/guardian";

type Phase = "checking" | "blocked" | "challenge" | "ready";

export function GuardianGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("checking");
  const [holdProgress, setHoldProgress] = useState(0);

  useEffect(() => {
    const flag = detectHeadless();
    if (flag) {
      setPhase("blocked");
      return;
    }
    if (sessionStorage.getItem(GATE_PASSED_KEY) === "1") {
      setPhase("ready");
      return;
    }
    setPhase("challenge");
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.isTrusted) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(1, elapsed / 1200);
      setHoldProgress(pct);
      if (pct >= 1) {
        sessionStorage.setItem(GATE_PASSED_KEY, "1");
        setPhase("ready");
        cancelAnimationFrame(raf);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const stop = () => {
      cancelAnimationFrame(raf);
      setHoldProgress(0);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("pointerleave", stop);
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("pointerleave", stop);
  };

  if (phase === "ready") return <>{children}</>;

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="font-display text-3xl mb-4">{t("brand")}</h1>
        {phase === "checking" && (
          <p className="font-sans text-sm text-foreground/70">{t("gate.checking")}</p>
        )}
        {phase === "blocked" && (
          <p className="font-sans text-sm text-foreground/80">{t("gate.blocked")}</p>
        )}
        {phase === "challenge" && (
          <>
            <p className="font-sans text-sm text-foreground/80 mb-6">{t("gate.challenge")}</p>
            <button
              type="button"
              onPointerDown={onPointerDown}
              className="relative w-full px-6 py-4 border border-foreground/85 bg-card font-mono text-sm uppercase tracking-[0.22em] overflow-hidden select-none"
              style={{ boxShadow: "5px 5px 0 var(--shadow)" }}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-foreground/15"
                style={{ width: `${holdProgress * 100}%`, transition: "width 16ms linear" }}
              />
              <span className="relative">{t("gate.holdButton")}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
