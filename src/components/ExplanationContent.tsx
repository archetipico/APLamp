import { Fragment, type ReactNode } from "react";

/**
 * Minimal markdown-ish renderer for exercise explanations.
 *
 * Supported syntax (intentionally narrow, no dependencies):
 *   - blank line              paragraph break
 *   - "- " line prefix        list item (consecutive items become a <ul>)
 *   - triple backtick fence   preformatted block (verbatim, monospace)
 *   - **text**                bold (inline)
 *   - `text`                  inline code (monospace)
 *
 * Anything else is treated as a plain paragraph line.
 */
export function ExplanationContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul
        key={`ul-${blocks.length}`}
        className="my-2 space-y-1 pl-1"
      >
        {listBuffer.map((item, i) => (
          <li
            key={i}
            className="relative pl-4 before:absolute before:left-0 before:top-[0.65em] before:w-2 before:h-px before:bg-[hsl(var(--ember))]"
          >
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const flushCode = () => {
    if (codeBuffer.length === 0) return;
    blocks.push(
      <pre
        key={`pre-${blocks.length}`}
        className="font-mono text-[12px] bg-foreground/[0.03] border-l border-foreground/30 px-3 py-1.5 my-2 whitespace-pre overflow-x-auto"
      >
        {codeBuffer.join("\n")}
      </pre>
    );
    codeBuffer = [];
  };

  for (const raw of lines) {
    const line = raw;
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }
    if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2));
      continue;
    }
    flushList();
    if (line.trim() === "") continue;
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-1.5">
        {renderInline(line)}
      </p>
    );
  }
  flushList();
  flushCode();

  return <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{blocks}</div>;
}

/**
 * Render a single line, expanding **bold** and `code` spans.
 * Matches are non-greedy on a single line; nesting is not supported and not
 * needed for the exercise corpus.
 */
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(
        <Fragment key={key++}>{text.slice(lastIdx, m.index)}</Fragment>
      );
    }
    if (m[1] !== undefined) {
      parts.push(<strong key={key++}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      parts.push(
        <code
          key={key++}
          className="font-mono text-[12.5px] px-[0.3em] py-px bg-foreground/[0.06] text-[hsl(var(--ember))] rounded-sm"
        >
          {m[2]}
        </code>
      );
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(<Fragment key={key++}>{text.slice(lastIdx)}</Fragment>);
  }
  return <>{parts}</>;
}
