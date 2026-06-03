export type Sample = { input: string; output: string };

export function extractSamples(content: string | null): Sample[] {
  if (!content) return [];
  const cfSamples = extractCFSamples(content);
  if (cfSamples.length > 0) return cfSamples;
  return extractLCSamples(content);
}

function stripTags(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
}

// Uses the same string-position approach as the admin refetch tool —
// regex alternatives consistently fail on nested CF HTML.
function extractCFSamples(html: string): Sample[] {
  const sampleIdx = html.indexOf('class="sample-test"');
  if (sampleIdx === -1) return [];

  const noteIdx = html.indexOf('class="note"', sampleIdx);
  const section =
    noteIdx !== -1
      ? html.slice(sampleIdx, noteIdx)
      : html.slice(sampleIdx, sampleIdx + 30000);

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

    const preStart = section.indexOf("<pre", divStart);
    if (preStart === -1) {
      pos = divStart + 1;
      continue;
    }
    const innerStart = section.indexOf(">", preStart) + 1;
    const innerEnd = section.indexOf("</pre>", innerStart);
    if (innerEnd === -1) {
      pos = preStart + 4;
      continue;
    }

    const text = stripTags(section.slice(innerStart, innerEnd)).trim();
    if (text) {
      if (isInput) inputs.push(text);
      else outputs.push(text);
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
