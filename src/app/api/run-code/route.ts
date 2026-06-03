import { type NextRequest, NextResponse } from "next/server";
import { getUser } from "~/lib/supabase/server";

const LANG_MAP: Record<string, string> = {
  "C++": "c++",
  Python: "python",
  Java: "java",
  JavaScript: "javascript",
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
  const pistonLang = language ? LANG_MAP[language] : null;
  if (!pistonLang) {
    return NextResponse.json(
      { error: "Unsupported language" },
      { status: 400 },
    );
  }
  if (stdin && stdin.length > 10000) {
    return NextResponse.json({ error: "Input too large" }, { status: 400 });
  }

  try {
    const res = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: pistonLang,
        version: "*",
        files: [{ content: code }],
        stdin: stdin ?? "",
        run_timeout: 5000,
        compile_timeout: 10000,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Execution engine error: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      run?: { stdout: string; stderr: string; code: number };
      compile?: { stderr: string; code: number };
    };

    const compileStderr = data.compile?.stderr ?? "";
    const runStderr = data.run?.stderr ?? "";
    const stderr = [compileStderr, runStderr].filter(Boolean).join("\n");
    const exitCode =
      data.compile?.code != null && data.compile.code !== 0
        ? data.compile.code
        : (data.run?.code ?? -1);

    return NextResponse.json({
      stdout: data.run?.stdout ?? "",
      stderr,
      exit_code: exitCode,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Execution failed" },
      { status: 500 },
    );
  }
}
