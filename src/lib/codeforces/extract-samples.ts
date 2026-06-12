export type Sample = { input: string; output: string };

export function extractSamples(content: string | null): Sample[] {
  if (!content) return [];

  // Strategy 1: CF — sample-test section with class="input"/"output" wrapper divs
  const s1 = extractByClassDivs(content);
  if (s1.length > 0) return s1;

  // Strategy 2: CF — sample-test section with class="title" divs directly inside
  const s2 = extractByTitleDivs(content);
  if (s2.length > 0) return s2;

  // Strategy 3: context lookback — strip tags from the 300 chars before each
  // <pre> and check if the last word is "input" or "output". Works regardless
  // of div class names or wrapping structure.
  const s3 = extractByPreContext(content);
  if (s3.length > 0) return s3;

  // Strategy 4: LC/generic — "Example N: Input: ... Output: ..." text patterns
  return extractLCSamples(content);
}

function stripTags(html: string): string {
  return (
    html
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<br\s*\/?>/gi, "\n")
      // CF's newer multi-test sample format wraps each line of a single sample
      // in its own block element (e.g. <div class="test-example-line ...">...).
      // Visually these render as separate boxes, but in the HTML they live inside
      // one <pre> with no <br>/newline between them. Treat the close of any
      // line-level block as a line break so the lines aren't collapsed together.
      .replace(/<\/(?:div|p|li|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      // Collapse the trailing whitespace / blank lines those block tags can leave.
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
  );
}

function sampleSection(html: string): string {
  const sampleIdx = html.indexOf('class="sample-test"');
  if (sampleIdx === -1) return "";
  const noteIdx = html.indexOf('class="note"', sampleIdx);
  return noteIdx !== -1
    ? html.slice(sampleIdx, noteIdx)
    : html.slice(sampleIdx, sampleIdx + 30000);
}

function extractPreAfterPos(
  section: string,
  pos: number,
): { text: string; end: number } | null {
  const preStart = section.indexOf("<pre", pos);
  if (preStart === -1) return null;
  const innerStart = section.indexOf(">", preStart) + 1;
  const innerEnd = section.indexOf("</pre>", innerStart);
  if (innerEnd === -1) return null;
  return {
    text: stripTags(section.slice(innerStart, innerEnd)).trim(),
    end: innerEnd + 6,
  };
}

// Strategy 1: looks for <div class="input"> / <div class="output"> wrappers
function extractByClassDivs(html: string): Sample[] {
  const section = sampleSection(html);
  if (!section) return [];

  const inputs: string[] = [];
  const outputs: string[] = [];
  let pos = 0;

  for (;;) {
    const nextInput = section.indexOf('<div class="input">', pos);
    const nextOutput = section.indexOf('<div class="output">', pos);
    if (nextInput === -1 && nextOutput === -1) break;

    const isInput =
      nextInput !== -1 && (nextOutput === -1 || nextInput < nextOutput);
    const divStart = isInput ? nextInput : nextOutput;

    const result = extractPreAfterPos(section, divStart);
    if (!result) {
      pos = divStart + 1;
      continue;
    }

    if (result.text) {
      if (isInput) inputs.push(result.text);
      else outputs.push(result.text);
    }
    pos = result.end;
  }

  const count = Math.min(inputs.length, outputs.length);
  return Array.from({ length: count }, (_, i) => ({
    input: inputs[i] ?? "",
    output: outputs[i] ?? "",
  }));
}

// Strategy 2: looks for <div class="title">Input</div> or <div class="title">Output</div>
// directly before <pre> blocks (no class="input"/"output" wrapper)
function extractByTitleDivs(html: string): Sample[] {
  // Use sample section if available; otherwise search whole document
  const section = sampleSection(html) || html;

  const inputs: string[] = [];
  const outputs: string[] = [];
  let pos = 0;

  for (;;) {
    const titleStart = section.indexOf('<div class="title">', pos);
    if (titleStart === -1) break;

    const titleEnd = section.indexOf("</div>", titleStart);
    if (titleEnd === -1) break;

    const titleText = section
      .slice(titleStart + 19, titleEnd)
      .trim()
      .toLowerCase();
    const isInput = titleText === "input";
    const isOutput = titleText === "output";

    if (isInput || isOutput) {
      const result = extractPreAfterPos(section, titleEnd);
      if (result?.text) {
        if (isInput) inputs.push(result.text);
        else outputs.push(result.text);
        pos = result.end;
        continue;
      }
    }
    pos = titleEnd + 6;
  }

  const count = Math.min(inputs.length, outputs.length);
  return Array.from({ length: count }, (_, i) => ({
    input: inputs[i] ?? "",
    output: outputs[i] ?? "",
  }));
}

// Strategy 3: for each <pre> block, strip tags from the 300 chars before it
// and check if the last word is "input" or "output".
function extractByPreContext(html: string): Sample[] {
  const inputs: string[] = [];
  const outputs: string[] = [];
  let pos = 0;

  for (;;) {
    const preStart = html.indexOf("<pre", pos);
    if (preStart === -1) break;

    const innerStart = html.indexOf(">", preStart) + 1;
    const innerEnd = html.indexOf("</pre>", innerStart);
    if (innerEnd === -1) break;

    const text = stripTags(html.slice(innerStart, innerEnd)).trim();
    if (text) {
      const before = stripTags(
        html.slice(Math.max(0, preStart - 300), preStart),
      )
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      if (/\binput$/.test(before)) inputs.push(text);
      else if (/\boutput$/.test(before)) outputs.push(text);
    }
    pos = innerEnd + 6;
  }

  const count = Math.min(inputs.length, outputs.length);
  return Array.from({ length: count }, (_, i) => ({
    input: inputs[i] ?? "",
    output: outputs[i] ?? "",
  }));
}

function extractLCSamples(html: string): Sample[] {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");

  const samples: Sample[] = [];
  const parts = text.split(/\bExample\s+\d+\s*[:：]/i);

  for (const part of parts.slice(1, 6)) {
    const inM = part.match(/\bInput\s*:\s*([\s\S]*?)(?=\bOutput\s*:)/i);
    const outM = part.match(
      /\bOutput\s*:\s*([\s\S]*?)(?=\bExplanation\s*:|\bInput\s*:|\bExample\s+\d|\bConstraints|\n{3}|$)/i,
    );
    if (inM && outM) {
      samples.push({ input: inM[1].trim(), output: outM[1].trim() });
    }
  }
  return samples;
}

export function normalizeOutput(s: string): string {
  return s
    .trim()
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n");
}
