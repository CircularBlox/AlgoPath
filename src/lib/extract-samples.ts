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

function extractCFSamples(html: string): Sample[] {
  const blockMatch = html.match(
    /<div[^>]+class="[^"]*sample-test[^"]*"[^>]*>([\s\S]+)/i,
  );
  if (!blockMatch) return [];
  const block = blockMatch[1];

  const inputRe =
    /<div[^>]+class="[^"]*\binput\b[^"]*"[^>]*>[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/gi;
  const outputRe =
    /<div[^>]+class="[^"]*\boutput\b[^"]*"[^>]*>[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/gi;

  const inputs = [...block.matchAll(inputRe)].map((m) =>
    stripTags(m[1]).trim(),
  );
  const outputs = [...block.matchAll(outputRe)].map((m) =>
    stripTags(m[1]).trim(),
  );

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
