export function detectHeadless(): string | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { webdriver?: boolean };
  if (nav.webdriver === true) return "webdriver";
  const ua = nav.userAgent || "";
  if (/HeadlessChrome|PhantomJS|SlimerJS|Puppeteer|Playwright/i.test(ua)) return "ua";
  if (!nav.languages || nav.languages.length === 0) return "languages";
  return null;
}

const RL_KEY = "apl.rl.exec";
const RL_WINDOW_MS = 60_000;
const RL_MAX = 60;

export function checkRateLimit(): { allowed: boolean; retryInMs: number } {
  let log: number[] = [];
  try {
    const raw = sessionStorage.getItem(RL_KEY);
    if (raw) log = JSON.parse(raw) as number[];
  } catch {
    log = [];
  }
  const now = Date.now();
  log = log.filter((t) => now - t < RL_WINDOW_MS);
  if (log.length >= RL_MAX) {
    const oldest = log[0];
    return { allowed: false, retryInMs: RL_WINDOW_MS - (now - oldest) };
  }
  log.push(now);
  try {
    sessionStorage.setItem(RL_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
  return { allowed: true, retryInMs: 0 };
}

export const GATE_PASSED_KEY = "apl.gate.passed";
