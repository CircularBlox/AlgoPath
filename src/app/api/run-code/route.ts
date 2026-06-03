import { type NextRequest, NextResponse } from "next/server";
import { getUser } from "~/lib/supabase/server";

// Judge0 CE language IDs
const LANG_MAP: Record<string, number> = {
  "C++": 54,
  Python: 71,
  Java: 62,
  JavaScript: 63,
};

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string; language?: string; stdin?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { code, language, stdin } = body;

  if (!code || code.length > 50000) {
    return NextResponse.json(
      { error: "Invalid or missing code" },
      { status: 400 },
    );
  }
  const langId = language ? LANG_MAP[language] : null;
  if (!langId) {
    return NextResponse.json(
      { error: "Unsupported language" },
      { status: 400 },
    );
  }
  if (stdin && stdin.length > 10000) {
    return NextResponse.json({ error: "Input too large" }, { status: 400 });
  }

  try {
    const res = await fetch(
      "https://ce.judge0.com/submissions/?base64_encoded=false&wait=true",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: langId,
          stdin: stdin ?? "",
          cpu_time_limit: 5,
          wall_time_limit: 10,
        }),
        signal: AbortSignal.timeout(25000),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Execution engine error: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      stdout: string | null;
      stderr: string | null;
      compile_output: string | null;
      message: string | null;
      status: { id: number; description: string };
    };

    const stderr =
      data.compile_output?.trim() ||
      data.stderr?.trim() ||
      data.message?.trim() ||
      "";

    // status id 3 = Accepted; anything else is an error
    const exit_code = data.status.id === 3 ? 0 : 1;

    return NextResponse.json({
      stdout: data.stdout ?? "",
      stderr,
      exit_code,
      status: data.status.description,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Execution failed" },
      { status: 500 },
    );
  }
}
