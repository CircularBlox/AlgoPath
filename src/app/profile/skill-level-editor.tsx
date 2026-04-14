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
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export function SkillLevelEditor({ initialLevel }: { initialLevel: string }) {
  const [editing, setEditing] = useState(false);
  const [level, setLevel] = useState(initialLevel);
  const [selected, setSelected] = useState(initialLevel);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayLabel =
    LEVELS.find((l) => l.value === level)?.label ??
    level.charAt(0).toUpperCase() + level.slice(1);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateSkillLevel(selected);
      if (result.success) {
        setLevel(selected);
        setEditing(false);
      } else {
        setError(result.error ?? "Failed to save.");
      }
    });
  }

  function handleCancel() {
    setSelected(level);
    setEditing(false);
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
          {isPending ? "Saving…" : "Save"}
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
