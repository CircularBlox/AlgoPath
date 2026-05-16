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

  // 2. Math stored in <code> tags — CF scraper stores LaTeX inside <code> without dollar wrappers.
  // First handle the explicit $...$ case, then detect LaTeX by presence of \command or subscript braces.
  out = out.replace(/<code>\$([^$<>]{1,500})\$<\/code>/g, (_, math) =>
    renderMath(math, false),
  );
  out = out.replace(/<code>([^<]{1,500})<\/code>/g, (full, inner) => {
    // Render if it contains a LaTeX command (\word) or a braced subscript/superscript (_{, ^{)
    if (/\\[a-zA-Z]|[_^]\{/.test(inner)) {
      return renderMath(inner.trim(), false);
    }
    return full;
  });

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
