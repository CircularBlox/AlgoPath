// ── AI review / chat rate limits ─────────────────────────────────────────────

/** Milliseconds a user must wait between AI requests. */
export const REVIEW_COOLDOWN_MS = 15_000;

/** Maximum AI requests (review + chat messages combined) per user per day. */
export const REVIEW_DAILY_LIMIT = 10;

/** Maximum messages allowed in a single chat session (enforced for everyone). */
export const CHAT_MAX_MESSAGES = 20;

// ── Input size limits ─────────────────────────────────────────────────────────

/** Maximum characters accepted for a code submission. */
export const CODE_MAX_LENGTH = 10_000;

/** Maximum characters accepted for a follow-up chat prompt. */
export const PROMPT_MAX_LENGTH = 2_000;
