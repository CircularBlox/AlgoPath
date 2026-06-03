"use client";

import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { updateSkillLevel } from "./actions";

const LEVELS = [
  { value: "beginner", label: "Beginner", rating: 1000 },
  { value: "intermediate", label: "Intermediate", rating: 1200 },
  { value: "advanced", label: "Advanced", rating: 1600 },
] as const;

export function SkillLevelEditor({ initialLevel }: { initialLevel: string }) {
  const [editing, setEditing] = useState(false);
  const [level, setLevel] = useState(initialLevel);
  const [selected, setSelected] = useState(initialLevel);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayLabel =
    LEVELS.find((l) => l.value === level)?.label ??
    level.charAt(0).toUpperCase() + level.slice(1);

  const selectedLevel = LEVELS.find((l) => l.value === selected);

  function handleSave() {
    if (selected === level) {
      setEditing(false);
      return;
    }
    setConfirming(true);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await updateSkillLevel(selected);
      if (result.success) {
        setLevel(selected);
        setEditing(false);
        setConfirming(false);
      } else {
        setError(result.error ?? "Failed to save.");
        setConfirming(false);
      }
    });
  }

  function handleCancel() {
    setSelected(level);
    setEditing(false);
    setConfirming(false);
    setError(null);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">{displayLabel}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Edit
        </button>
      </div>
    );
  }

  if (confirming && selectedLevel) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Switching to{" "}
          <span className="font-semibold">{selectedLevel.label}</span> will
          reset your rating to{" "}
          <span className="font-semibold">
            {selectedLevel.rating.toLocaleString()}
          </span>
          . Your recommended problems will update to match.
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Saving…" : "Confirm"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            Go back
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-8 w-[10rem] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
