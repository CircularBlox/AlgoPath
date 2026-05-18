"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) throw new Error("Failed to open portal");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Loading…" : "Manage plan"}
    </Button>
  );
}
