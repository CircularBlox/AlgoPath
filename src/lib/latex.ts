function renderMath(tex: string): string {
  let s = tex;
  // Braced commands first (longer patterns before their prefix versions)
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
  s = s.replace(/\\pmod\{([^{}]+)\}/g, "(mod $1)");
  s = s.replace(/\\text\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\textbf\{([^{}]+)\}/g, "<strong>$1</strong>");
  s = s.replace(/\\textit\{([^{}]+)\}/g, "<em>$1</em>");
  s = s.replace(/\\mathbf\{([^{}]+)\}/g, "<strong>$1</strong>");
  s = s.replace(/\\mathit\{([^{}]+)\}/g, "<em>$1</em>");
  s = s.replace(/\\mathrm\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\mathcal\{([^{}]+)\}/g, "$1");
  // Superscripts / subscripts with braces
  s = s.replace(/\^\{([^{}]+)\}/g, "<sup>$1</sup>");
  s = s.replace(/_\{([^{}]+)\}/g, "<sub>$1</sub>");
  // Single-char superscripts / subscripts
  s = s.replace(/\^(\w)/g, "<sup>$1</sup>");
  s = s.replace(/_(\w)/g, "<sub>$1</sub>");
  // Inequalities / relations (leq before le, geq before ge, neq before ne)
  s = s.replace(/\\leq\b/g, "≤");
  s = s.replace(/\\le\b/g, "≤");
  s = s.replace(/\\geq\b/g, "≥");
  s = s.replace(/\\ge\b/g, "≥");
  s = s.replace(/\\neq\b/g, "≠");
  s = s.replace(/\\ne\b/g, "≠");
  s = s.replace(/\\approx\b/g, "≈");
  s = s.replace(/\\equiv\b/g, "≡");
  s = s.replace(/\\sim\b/g, "∼");
  // Arithmetic
  s = s.replace(/\\times\b/g, "×");
  s = s.replace(/\\cdot\b/g, "·");
  s = s.replace(/\\div\b/g, "÷");
  s = s.replace(/\\pm\b/g, "±");
  s = s.replace(/\\mp\b/g, "∓");
  // Ellipses
  s = s.replace(/\\ldots\b/g, "…");
  s = s.replace(/\\cdots\b/g, "⋯");
  s = s.replace(/\\vdots\b/g, "⋮");
  s = s.replace(/\\ddots\b/g, "⋱");
  // Big operators
  s = s.replace(/\\sum\b/g, "∑");
  s = s.replace(/\\prod\b/g, "∏");
  s = s.replace(/\\int\b/g, "∫");
  s = s.replace(/\\infty\b/g, "∞");
  s = s.replace(/\\sqrt\b/g, "√");
  // Sets / logic
  s = s.replace(/\\in\b/g, "∈");
  s = s.replace(/\\notin\b/g, "∉");
  s = s.replace(/\\subset\b/g, "⊂");
  s = s.replace(/\\subseteq\b/g, "⊆");
  s = s.replace(/\\supset\b/g, "⊃");
  s = s.replace(/\\supseteq\b/g, "⊇");
  s = s.replace(/\\cup\b/g, "∪");
  s = s.replace(/\\cap\b/g, "∩");
  s = s.replace(/\\emptyset\b/g, "∅");
  s = s.replace(/\\forall\b/g, "∀");
  s = s.replace(/\\exists\b/g, "∃");
  s = s.replace(/\\neg\b/g, "¬");
  s = s.replace(/\\land\b/g, "∧");
  s = s.replace(/\\lor\b/g, "∨");
  s = s.replace(/\\oplus\b/g, "⊕");
  s = s.replace(/\\otimes\b/g, "⊗");
  // Arrows
  s = s.replace(/\\Leftrightarrow\b/g, "⟺");
  s = s.replace(/\\Rightarrow\b/g, "⇒");
  s = s.replace(/\\Leftarrow\b/g, "⇐");
  s = s.replace(/\\rightarrow\b/g, "→");
  s = s.replace(/\\leftarrow\b/g, "←");
  s = s.replace(/\\to\b/g, "→");
  // Brackets
  s = s.replace(/\\lfloor\b/g, "⌊");
  s = s.replace(/\\rfloor\b/g, "⌋");
  s = s.replace(/\\lceil\b/g, "⌈");
  s = s.replace(/\\rceil\b/g, "⌉");
  s = s.replace(/\\langle\b/g, "⟨");
  s = s.replace(/\\rangle\b/g, "⟩");
  s = s.replace(/\\lvert\b/g, "|");
  s = s.replace(/\\rvert\b/g, "|");
  s = s.replace(/\\lVert\b/g, "‖");
  s = s.replace(/\\rVert\b/g, "‖");
  // Greek (uppercase before lowercase where prefix overlaps)
  s = s.replace(/\\Gamma\b/g, "Γ");
  s = s.replace(/\\gamma\b/g, "γ");
  s = s.replace(/\\Delta\b/g, "Δ");
  s = s.replace(/\\delta\b/g, "δ");
  s = s.replace(/\\Theta\b/g, "Θ");
  s = s.replace(/\\theta\b/g, "θ");
  s = s.replace(/\\Lambda\b/g, "Λ");
  s = s.replace(/\\lambda\b/g, "λ");
  s = s.replace(/\\Pi\b/g, "Π");
  s = s.replace(/\\pi\b/g, "π");
  s = s.replace(/\\Sigma\b/g, "Σ");
  s = s.replace(/\\sigma\b/g, "σ");
  s = s.replace(/\\Phi\b/g, "Φ");
  s = s.replace(/\\phi\b/g, "φ");
  s = s.replace(/\\Psi\b/g, "Ψ");
  s = s.replace(/\\psi\b/g, "ψ");
  s = s.replace(/\\Omega\b/g, "Ω");
  s = s.replace(/\\omega\b/g, "ω");
  s = s.replace(/\\alpha\b/g, "α");
  s = s.replace(/\\beta\b/g, "β");
  s = s.replace(/\\varepsilon\b/g, "ε");
  s = s.replace(/\\epsilon\b/g, "ε");
  s = s.replace(/\\zeta\b/g, "ζ");
  s = s.replace(/\\eta\b/g, "η");
  s = s.replace(/\\iota\b/g, "ι");
  s = s.replace(/\\kappa\b/g, "κ");
  s = s.replace(/\\mu\b/g, "μ");
  s = s.replace(/\\nu\b/g, "ν");
  s = s.replace(/\\xi\b/g, "ξ");
  s = s.replace(/\\rho\b/g, "ρ");
  s = s.replace(/\\tau\b/g, "τ");
  s = s.replace(/\\upsilon\b/g, "υ");
  s = s.replace(/\\chi\b/g, "χ");
  // Functions
  s = s.replace(/\\log\b/g, "log");
  s = s.replace(/\\ln\b/g, "ln");
  s = s.replace(/\\max\b/g, "max");
  s = s.replace(/\\min\b/g, "min");
  s = s.replace(/\\gcd\b/g, "gcd");
  s = s.replace(/\\lcm\b/g, "lcm");
  s = s.replace(/\\bmod\b/g, "mod");
  s = s.replace(/\\mod\b/g, "mod");
  // Misc
  s = s.replace(/\\&/g, "&amp;");
  s = s.replace(/\\\{/g, "{");
  s = s.replace(/\\\}/g, "}");
  // Strip remaining unknown commands and lone braces
  s = s.replace(/\\[a-zA-Z]+\b/g, "");
  s = s.replace(/[{}]/g, "");
  return s;
}

/**
 * Processes LaTeX math in Codeforces-style HTML ($...$ and $$...$$).
 * Replaces common commands with Unicode/HTML — no external library needed.
 */
export function processHtmlLatex(html: string): string {
  // Display math $$...$$ first
  let out = html.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
    return `<span class="math-block">${renderMath(math.trim())}</span>`;
  });
  // Inline math $...$ — avoid tag attributes and line breaks
  out = out.replace(/\$([^$\n<>]{1,500})\$/g, (_, math) => {
    return `<span class="math-inline">${renderMath(math)}</span>`;
  });
  return out;
}
