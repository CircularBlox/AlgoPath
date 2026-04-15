"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

const supabase = createClient();

export default function SetupUsernamePage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function sanitize(value: string) {
    return value.replace(/[^a-zA-Z0-9_]/g, "");
  }

  // Debounced availability check
  useEffect(() => {
    if (username.length < 3) {
      setAvailability("idle");
      return;
    }

    setAvailability("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .maybeSingle();
      if (!cancelled) setAvailability(data ? "taken" : "available");
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (availability === "taken") return;
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    // Guard: if profile already exists, skip straight to the app
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      router.replace("/display-problem");
      return;
    }

    const { error: updateError } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      username_confirmed: true,
      rating: 1200,
      skill_level: "intermediate",
    });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      router.push("/display-problem");
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Choose a username</h1>
        <p className="text-sm text-muted-foreground">
          Pick a username for your AlgoPath profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="coder123"
            value={username}
            onChange={(e) => setUsername(sanitize(e.target.value))}
            required
            minLength={3}
            maxLength={32}
          />
          {availability === "checking" && (
            <p className="text-xs text-muted-foreground">Checking…</p>
          )}
          {availability === "available" && (
            <p className="text-xs text-green-600">Username is available.</p>
          )}
          {availability === "taken" && (
            <p className="text-xs text-destructive">
              Username is already taken.
            </p>
          )}
          {availability === "idle" && (
            <p className="text-xs text-muted-foreground">
              3–32 characters. Letters (A–Z), numbers, and underscores only.
            </p>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={
            loading ||
            username.length < 3 ||
            availability === "taken" ||
            availability === "checking"
          }
        >
          {loading ? "Saving…" : "Continue"}
        </Button>
      </form>
    </main>
  );
}
