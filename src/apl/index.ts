import { parseProgram, emptyEnv, type ParseEnv } from "./parse";
import { Env, evaluate, type FuncValue } from "./evaluate";
import { format } from "./format";
import type { APLArray } from "./types";
import { APLError, empty } from "./types";

export interface APLSession {
  parseEnv: ParseEnv;
  runtime: Env;
}

export interface APLResult {
  output: string;
  isError: boolean;
  errorKind?: string;
  value?: APLArray | FuncValue;
}

export const newSession = (): APLSession => {
  const session: APLSession = {
    parseEnv: emptyEnv(),
    runtime: new Env(),
  };
  return session;
};

export const runLine = (src: string, session: APLSession): APLResult[] => {
  try {
    const prog = parseProgram(src, session.parseEnv);
    const results: APLResult[] = [];
    for (const stmt of prog.statements) {
      try {
        const v = evaluate(stmt, session.runtime);
        if (isAPLArray(v)) {
          if (stmt.type === "assign") {
            results.push({ output: "", isError: false, value: v });
          } else {
            results.push({
              output: format(v),
              isError: false,
              value: v,
            });
          }
        } else {
          results.push({ output: "", isError: false, value: v });
        }
      } catch (e) {
        results.push(toErr(e));
      }
    }
    if (results.length === 0)
      results.push({ output: "", isError: false, value: empty() });
    return results;
  } catch (e) {
    return [toErr(e)];
  }
};

const isAPLArray = (v: APLArray | FuncValue): v is APLArray =>
  (v as APLArray).data !== undefined && Array.isArray((v as APLArray).shape);

const toErr = (e: unknown): APLResult => {
  if (e instanceof APLError)
    return { output: `${e.kind} ERROR: ${e.message.replace(/^[A-Z]+ ERROR:\s*/i, "")}`, isError: true, errorKind: e.kind };
  if (e instanceof Error)
    return { output: e.message, isError: true, errorKind: "ERROR" };
  return { output: String(e), isError: true, errorKind: "ERROR" };
};

export { format } from "./format";
export type { APLArray, FuncValue };
