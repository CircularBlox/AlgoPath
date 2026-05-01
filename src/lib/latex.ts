import katex from "katex";

function renderMath(tex: string, display: boolean): string {
  // CF uses \color{red}{...} to highlight constraints; strip the color command and keep the content
  const processed = tex
    .replace(/\\color\{[^}]+\}/g, "")
    .replace(/\\textcolor\{[^}]+\}/g, "");
  try {
    return katex.renderToString(processed, {
      throwOnError: false,
      displayMode: display,
      output: "html",
    });
  } catch {
    return processed;
  }
}

/**
 * Processes LaTeX math in problem HTML from various sources.
 * Handles CF <span class="math-tex">\(...\)</span>, <code>$...$</code>,
 * standalone \(...\) / \[...\], $$...$$, and $...$.
 */
export function processHtmlLatex(html: string): string {
  let out = html;

  // 1. Codeforces: <span class="math-tex">\(...\)</span>
  out = out.replace(
    /<span[^>]*class="math-tex"[^>]*>\\\(([^<]{0,1000})\\\)<\/span>/g,
    (_, math) => renderMath(math.trim(), false),
  );
  out = out.replace(
    /<span[^>]*class="math-tex"[^>]*>\\\[([^<]{0,2000})\\\]<\/span>/g,
    (_, math) => renderMath(math.trim(), true),
  );

  // 2. Math accidentally stored in <code> tags
  out = out.replace(/<code>\$([^$<>]{1,500})\$<\/code>/g, (_, math) =>
    renderMath(math, false),
  );
  out = out.replace(
    /<code>((?:\\[a-zA-Z]+|[^<>{}]{0,20}){1,20})<\/code>/g,
    (full, inner) => {
      if (/\\[a-zA-Z]/.test(inner)) {
        return renderMath(inner.trim(), false);
      }
      return full;
    },
  );

  // 3. Standalone \(...\) inline math
  out = out.replace(/\\\(([^<>\n]{0,1000})\\\)/g, (_, math) =>
    renderMath(math.trim(), false),
  );

  // 4. Standalone \[...\] display math
  out = out.replace(/\\\[([^<>\n]{0,2000})\\\]/g, (_, math) =>
    renderMath(math.trim(), true),
  );

  // 5. $$...$$ display math
  out = out.replace(/\$\$([^$<>\n]{0,2000})\$\$/g, (_, math) =>
    renderMath(math.trim(), true),
  );

  // 6. $...$ inline math — avoid HTML tag boundaries and newlines
  out = out.replace(/\$([^$\n<>]{1,500})\$/g, (_, math) =>
    renderMath(math, false),
  );

  return out;
}
