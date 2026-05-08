"use client";

import { useMemo } from "react";

export const CODE_CLS =
  "rounded bg-[oklch(0.8_0_0)] px-1 font-mono text-xs";

export function formatInline(s: string): string {
  return s
    .replace(/\$\s*([^$]+?)\s*\$/g, `<code class="${CODE_CLS}">$1</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, `<code class="${CODE_CLS}">$1</code>`);
}

export function FormattedText({ text }: { text: string }) {
  const html = useMemo(() => {
    const parts: string[] = [];
    let inList = false;
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line) {
        if (inList) {
          parts.push("</ul>");
          inList = false;
        }
        continue;
      }
      if (/^[*-] /.test(line)) {
        if (!inList) {
          parts.push('<ul class="list-disc list-inside space-y-0.5 my-1">');
          inList = true;
        }
        parts.push(`<li>${formatInline(line.slice(2))}</li>`);
      } else {
        if (inList) {
          parts.push("</ul>");
          inList = false;
        }
        parts.push(`<p class="mb-1">${formatInline(line)}</p>`);
      }
    }
    if (inList) parts.push("</ul>");
    return parts.join("");
  }, [text]);

  // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored DB content
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
