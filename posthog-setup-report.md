<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into AlgoPath (the Next.js + Supabase competitive programming app).

## Summary of changes

- **`posthog-js`** and **`posthog-node`** installed as dependencies
- **`src/instrumentation-client.ts`** — PostHog client-side SDK initialized alongside Sentry, using the `/ingest` reverse proxy path and `capture_exceptions: true` for error tracking
- **`next.config.ts`** — Reverse proxy rewrites added for `/ingest/*`, `/ingest/static/*`, and `/ingest/array/*` to route PostHog traffic through Next.js
- **`src/env.ts`** — `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` added to the validated environment schema
- **`.env.local`** — PostHog token and host written via the wizard-tools MCP (never committed)
- **`src/lib/posthog-server.ts`** — Server-side PostHog client helper (`getPostHogClient()`) created for use in API routes
- **`src/components/posthog-identify.tsx`** — Client component that identifies the authenticated Supabase user in PostHog on every page load and calls `posthog.reset()` on sign-out
- **`src/app/layout.tsx`** — `<PostHogIdentify />` added to the root layout

## Events instrumented

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User successfully completed email signup | `src/app/auth/signup/page.tsx` |
| `user_logged_in` | User successfully logged in with email/password | `src/app/auth/login/page.tsx` |
| `oauth_clicked` | User clicked a Google or GitHub OAuth button | `src/app/auth/login/page.tsx`, `src/app/auth/signup/page.tsx` |
| `onboarding_completed` | User finished the 5-step onboarding flow | `src/app/onboarding/onboarding-form.tsx` |
| `problem_viewed` | User viewed a problem page — top of the hint funnel | `src/app/display-problem/problem-viewer.tsx` |
| `hint_revealed` | User unlocked a progressive hint (level 1–3) | `src/app/display-problem/problem-viewer.tsx` |
| `solution_viewed` | User opened the official solution | `src/app/display-problem/problem-viewer.tsx` |
| `problem_solved` | User marked a problem as solved (client-side) | `src/app/display-problem/problem-viewer.tsx` |
| `hint_rated` | User submitted a thumbs-up/down rating for a hint | `src/app/display-problem/problem-viewer.tsx` |
| `problem_solved_server` | Server-side: solve confirmed, XP and rating awarded | `src/app/api/profiles/solve/route.ts` |
| `hint_rated_server` | Server-side: hint rating persisted to database | `src/app/api/problems/[number]/hints/rate/route.ts` |

## User identification

- `posthog.identify()` is called with the user's email on login and signup
- `PostHogIdentify` component re-identifies the user on every page load via Supabase `getUser()`
- `posthog.reset()` is called automatically when Supabase fires a `SIGNED_OUT` auth event

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/406803/dashboard/1536594
- **Signup → Solve Conversion Funnel**: https://us.posthog.com/project/406803/insights/hwpBhex2
- **Daily Problems Solved**: https://us.posthog.com/project/406803/insights/AQXKDudb
- **New Signups per Day**: https://us.posthog.com/project/406803/insights/GfaXdmnb
- **Hint Engagement: Views vs Reveals vs Ratings**: https://us.posthog.com/project/406803/insights/6CactdGr
- **Onboarding Drop-off: Completion vs Skip Rate**: https://us.posthog.com/project/406803/insights/GEGxPkNa

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
