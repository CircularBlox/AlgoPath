import { NextResponse } from "next/server";
import { getAuthContext } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";

export const dynamic = "force-dynamic";

// List all FAQs (admin view — public reads go through the server component).
export async function GET() {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin_client = createAdminClient();
  const { data, error } = await admin_client
    .from("faqs")
    .select("id, question, answer, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, faqs: data });
}

// Create a new FAQ entry.
export async function POST(req: Request) {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { question, answer, sortOrder } = body as {
    question?: string;
    answer?: string;
    sortOrder?: number;
  };

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json(
      { error: "question and answer are required" },
      { status: 400 },
    );
  }

  const admin_client = createAdminClient();
  const { data, error } = await admin_client
    .from("faqs")
    .insert({
      question: question.trim(),
      answer: answer.trim(),
      sort_order: typeof sortOrder === "number" ? sortOrder : 0,
    })
    .select("id, question, answer, sort_order, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, faq: data });
}

// Update an existing FAQ entry.
export async function PATCH(req: Request) {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, question, answer, sortOrder } = body as {
    id?: string;
    question?: string;
    answer?: string;
    sortOrder?: number;
  };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof question === "string") update.question = question.trim();
  if (typeof answer === "string") update.answer = answer.trim();
  if (typeof sortOrder === "number") update.sort_order = sortOrder;

  const admin_client = createAdminClient();
  const { error } = await admin_client.from("faqs").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}

// Delete an FAQ entry.
export async function DELETE(req: Request) {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id } = body as { id?: string };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const admin_client = createAdminClient();
  const { error } = await admin_client.from("faqs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
