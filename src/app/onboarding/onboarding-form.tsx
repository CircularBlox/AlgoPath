"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SKILL_OPTIONS = [
  {
    value: "beginner",
    label: "Beginner",
    desc: "New to competitive programming, learning the basics",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    desc: "Solved 50–200 problems, familiar with core algorithms",
  },
  {
    value: "advanced",
    label: "Advanced",
    desc: "Regular contest participant, aiming for top rankings",
  },
];

const RATING_OPTIONS = [
  {
    value: 800,
    label: "Just starting out",
    desc: "New to competitive programming, fewer than 30 problems solved",
  },
  {
    value: 1000,
    label: "Getting comfortable",
    desc: "Can solve easy problems, working through LeetCode",
  },
  {
    value: 1200,
    label: "Regular solver",
    desc: "Comfortable with mediums, 100+ problems solved",
  },
  {
    value: 1400,
    label: "Contest participant",
    desc: "Compete regularly, CF ~1200–1600 or LeetCode knight+",
  },
  {
    value: 1600,
    label: "Experienced competitor",
    desc: "CF 1700+, consistently solving hard problems",
  },
];

const GOAL_OPTIONS = [
  {
    value: "contests",
    label: "Compete in Contests",
    desc: "Codeforces, ICPC, IOI preparation",
  },
  {
    value: "interviews",
    label: "Crack Interviews",
    desc: "FAANG and top-tier company preparation",
  },
  {
    value: "learning",
    label: "Learn Algorithms",
    desc: "Deep-dive into data structures and techniques",
  },
  {
    value: "fun",
    label: "Just for Fun",
    desc: "Explore problems at my own pace",
  },
];

const LANGUAGE_OPTIONS = ["C++", "Python", "Java", "JavaScript"];

const DAILY_OPTIONS = [
  { value: 1, label: "1 problem / day", desc: "Casual pace" },
  { value: 3, label: "3 problems / day", desc: "Consistent practice" },
  { value: 5, label: "5 problems / day", desc: "Dedicated grind" },
  { value: 10, label: "10+ problems / day", desc: "Serious preparation" },
];

const TOTAL_STEPS = 5;
const STEP_KEYS = ["dot-1", "dot-2", "dot-3", "dot-4", "dot-5"] as const;

export function OnboardingForm({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Answers — all optional (skip allowed)
  const [skillLevel, setSkillLevel] = useState<string | null>(null);
  const [startingRating, setStartingRating] = useState<number | null>(null);
  const [cpGoal, setCpGoal] = useState<string | null>(null);
  const [langs, setLangs] = useState<string[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);

  function toggleLang(lang: string) {
    setLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  async function finish() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          skill_level: skillLevel,
          starting_rating: startingRating,
          cp_goal: cpGoal,
          preferred_languages: langs,
          daily_goal: dailyGoal,
        }),
      });
    } catch {
      // Non-fatal — proceed regardless
    }
    router.push("/display-problem");
  }

  function advance() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }

  const isLast = step === TOTAL_STEPS;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "var(--color-background)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            justifyContent: "center",
          }}
        >
          {STEP_KEYS.map((key, i) => (
            <div
              key={key}
              style={{
                width: i + 1 === step ? "1.75rem" : "0.5rem",
                height: "0.5rem",
                borderRadius: "9999px",
                background:
                  i + 1 <= step
                    ? "var(--color-foreground)"
                    : "var(--color-border)",
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1.75rem 1.75rem 1.25rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <p
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-muted-foreground)",
                marginBottom: "0.4rem",
              }}
            >
              Step {step} of {TOTAL_STEPS}
            </p>
            <h1
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "var(--color-foreground)",
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              {step === 1 && "What's your experience level?"}
              {step === 2 && "Estimate your starting rating"}
              {step === 3 && "What brings you here?"}
              {step === 4 && "Preferred languages?"}
              {step === 5 && "Daily practice goal?"}
            </h1>
            <p
              style={{
                marginTop: "0.35rem",
                fontSize: "0.875rem",
                color: "var(--color-muted-foreground)",
              }}
            >
              {step === 1 &&
                "We'll tailor problem difficulty to your background."}
              {step === 2 &&
                "Sets your starting rating so you see appropriately-difficult problems from day one."}
              {step === 3 && "Helps us recommend the right problem types."}
              {step === 4 &&
                "Solutions will default to your preferred language."}
              {step === 5 && "We'll remind you to keep your streak going."}
            </p>
          </div>

          {/* Options */}
          <div style={{ padding: "1.25rem 1.75rem" }}>
            {step === 1 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                {SKILL_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    label={opt.label}
                    desc={opt.desc}
                    selected={skillLevel === opt.value}
                    onClick={() =>
                      setSkillLevel(skillLevel === opt.value ? null : opt.value)
                    }
                  />
                ))}
              </div>
            )}

            {step === 2 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                {RATING_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    label={opt.label}
                    desc={opt.desc}
                    selected={startingRating === opt.value}
                    onClick={() =>
                      setStartingRating(
                        startingRating === opt.value ? null : opt.value,
                      )
                    }
                    badge={String(opt.value)}
                  />
                ))}
              </div>
            )}

            {step === 3 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.6rem",
                }}
              >
                {GOAL_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    label={opt.label}
                    desc={opt.desc}
                    selected={cpGoal === opt.value}
                    onClick={() =>
                      setCpGoal(cpGoal === opt.value ? null : opt.value)
                    }
                  />
                ))}
              </div>
            )}

            {step === 4 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.6rem",
                }}
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <OptionCard
                    key={lang}
                    label={lang}
                    selected={langs.includes(lang)}
                    onClick={() => toggleLang(lang)}
                    multiSelect
                  />
                ))}
              </div>
            )}

            {step === 5 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.6rem",
                }}
              >
                {DAILY_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    label={opt.label}
                    desc={opt.desc}
                    selected={dailyGoal === opt.value}
                    onClick={() =>
                      setDailyGoal(dailyGoal === opt.value ? null : opt.value)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1rem 1.75rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <button
              type="button"
              onClick={advance}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-muted-foreground)",
                fontSize: "0.875rem",
                cursor: "pointer",
                padding: "0.25rem 0",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              {isLast ? "Skip & finish" : "Skip this step"}
            </button>
            <button
              type="button"
              onClick={advance}
              disabled={saving}
              style={{
                background: "var(--color-foreground)",
                color: "var(--color-background)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0.6rem 1.4rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : isLast ? "Get started" : "Continue"}
            </button>
          </div>
        </div>

        {/* Branding */}
        <p
          style={{
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--color-muted-foreground)",
          }}
        >
          You can change these anytime in Settings.
        </p>
      </div>
    </div>
  );
}

function OptionCard({
  label,
  desc,
  selected,
  onClick,
  multiSelect = false,
  badge,
}: {
  label: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
  multiSelect?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.2rem",
        textAlign: "left",
        padding: "0.85rem 1rem",
        borderRadius: "var(--radius-lg)",
        border: selected
          ? "1.5px solid var(--color-foreground)"
          : "1.5px solid var(--color-border)",
        background: selected ? "var(--color-muted)" : "transparent",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.45rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "var(--color-foreground)",
          width: "100%",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          {multiSelect && (
            <span
              style={{
                width: "1rem",
                height: "1rem",
                borderRadius: "3px",
                border: selected
                  ? "1.5px solid var(--color-foreground)"
                  : "1.5px solid var(--color-muted-foreground)",
                background: selected
                  ? "var(--color-foreground)"
                  : "transparent",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selected && (
                <svg
                  aria-hidden="true"
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="var(--color-background)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="10 3 5 9 2 6" />
                </svg>
              )}
            </span>
          )}
          {label}
        </span>
        {badge && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--color-muted-foreground)",
              background: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "0.1rem 0.4rem",
              letterSpacing: "0.02em",
            }}
          >
            {badge}
          </span>
        )}
      </span>
      {desc && (
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-muted-foreground)",
            paddingLeft: multiSelect ? "1.45rem" : "0",
          }}
        >
          {desc}
        </span>
      )}
    </button>
  );
}
