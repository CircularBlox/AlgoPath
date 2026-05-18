"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";

type Props = {
  priceId: string | null;
  label: string;
  variant?: "default" | "outline";
  className?: string;
};

export function UpgradeButton({
  priceId,
  label,
  variant = "default",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  if (!priceId) {
    return (
      <Button asChild variant={variant} size="sm" className={className}>
        <Link href="/auth/signup">{label}</Link>
      </Button>
    );
  }

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          window.location.href = "/auth/signup";
          return;
        }
        throw new Error(err.error ?? "Failed to start checkout");
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
