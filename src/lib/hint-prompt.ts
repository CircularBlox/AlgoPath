// Shared builder for the 3-progressive-hints prompt, used by the admin
// generate-hints routes. Kept in sync with scripts/gen-hints-ollama.mjs
// (standalone .mjs can't import from src, so that file mirrors this logic).
//
// Design note: the prompt deliberately does NOT include the problem title.
// Codeforces-style titles frequently name the very technique the solver is
// meant to discover (e.g. "Learning Binary Search") or are deliberate red
// herrings (e.g. "Minimum Path Cover" — "despite what the name suggests…"),
// and scraped titles can be garbled ("RReeppeettiittiioonn"). Hints are built
// from the cleaned statement instead; tags only steer the direction sparingly.

export type HintProblem = {
  content: string | null;
  difficulty: string | null;
  tags: string[] | null;
};

// Strip HTML/entities and the boilerplate header (echoed title + time/memory
// limits) so the model reads the real statement, not the misleading title.
export function cleanStatement(html: string | null): string {
  let c = (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  const m = c.search(/\bProblem\b/);
  if (m !== -1 && m < 200) c = c.slice(m + "Problem".length).trim();
  return c.slice(0, 2500);
}

export function buildHintPrompt(problem: HintProblem): string {
  const tags = (problem.tags ?? []).join(", ") || "none";
  const statement = cleanStatement(problem.content);
  return `You are a competitive-programming mentor writing three short, progressive hints for the problem under "PROBLEM STATEMENT" below. Work ONLY from that statement — never from the problem's title or name (titles are often misleading or name the very idea the solver should discover).

How the hints should feel:
- Orient, don't instruct. Each hint shifts the solver's attention toward a productive way of seeing the problem, then stops. Never name an algorithm, data structure, or complexity, and never lay out steps or a recipe.
- Lead forward, and vary the phrasing — not every hint is a question. Mix a quiet observation with the occasional question that already reframes the problem. Avoid hollow prompts like "what does it ask?". The strongest nudges quietly change the unit of thinking. Adapt these PATTERNS to this problem's own nouns — do NOT copy the words:
   • "How much does each <element> contribute to the <total>, counted on its own?"
   • "What are all the ways to produce a single <thing>?"
   • "This <quantity> gets re-counted many times — could it be tallied just once?"
   • "Fix <one part> and imagine its outcome; how much freedom is left in the rest?"
- Progress in depth, and make the three deliberately UNEQUAL. Hints 1 and 2 are gentle steps that only orient: hint 1 nudges the angle of approach, hint 2 narrows to the key quantity or structure — neither hands over the method, and neither names or alludes to any technique even if the statement mentions one. Hint 3 is the payoff: bring the solver almost all the way — surface the crucial observation, relationship, or quantity to exploit, phrased naturally as something to notice, so a stuck solver can see the path. Do NOT announce it (never write "the key insight", "the trick is", or any such label), stay a touch lighter than a full explanation, and leave the final connection to them (never give the construction, final formula, or code).
- Stay specific to THIS problem's real elements, constraints, and quantities; use $term$ for key symbols.

PROBLEM STATEMENT:
${statement}

Difficulty: ${problem.difficulty ?? "unknown"}
Topic tags (use sparingly, only to steer the general direction — never name or restate them): ${tags}

Respond with ONLY this JSON object, no other text:
{"hint_1": "...", "hint_2": "...", "hint_3": "..."}

Rules:
- Three hints, each 1–2 sentences, deliberately escalating: 1 and 2 are gentle steps, 3 is the real unlock.
- Hints 1 and 2 only orient and reframe — they must NOT give the method or a recipe, and must NOT name or allude to any technique, even one named in the statement.
- Hint 3 brings the solver almost all the way: surface the crucial observation or relationship to exploit, phrased naturally as something to notice — but do NOT preface it with "the key insight", "the trick is", or similar labels, keep it a touch lighter than a full explanation, and never give the complete solution, final formula, or step-by-step construction.
- Vary the phrasing — not every hint should be a question.
- Be specific to THIS statement's real elements; use $term$ for key symbols. Use the patterns above only as phrasing models, with this problem's own nouns.
- Do not name an algorithm, data structure, or complexity in hints 1–2 (even if the statement uses one); in hint 3 you may name the core idea if it is the crux, but never spell out the full algorithm or code.
- No labels, bullets, or headers inside the hint text.`;
}
