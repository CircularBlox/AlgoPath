# CLAUDE.md

## Project Overview
This is a Next.js + Supabase app for competitive programmers that helps them get AI-generated, adaptive, step-by-step hints on problems they are working on. Users can paste a problem URL and their current attempt (code or notes), and receive 3 progressive hints to guide them without giving the full solution.  

**Target users:** Competitive programmers who are stuck on coding problems, from intermediate LeetCode users to top contest participants. Especially for programming like USACO.

IMPORTANT - Update MEMORY.md for every prompt.
IMPORTANT - Update Changelog for any major updates or minor ones with proper conventions, with vx.x.x.



---

## MVP Features
- Users can paste problem URLs and their attempt
- AI generates 3 step-by-step hints per attempt
- Users can mark progress or rate hint usefulness
- Save attempts and hints to their account
- Basic notes for each attempt

**Deferred for later versions:**
- Mentor chat / live feedback
- Gamification (streaks, leaderboards)
- Community features (forums, feeds, groups)
- Payments or subscription features
- Full problem database (use Codeforces/LeetCode links only)

---

## Core CRUD

**Users**
- Create: sign up / log in
- Read: view profile
- Update: skill level
- Delete: delete account

**Problems** (reference-only)
- Create: save problem URL
- Read: view saved problems
- Update: add tags/notes
- Delete: remove

**Attempts** (core)
- Create: start attempt (problem + notes/code)
- Read: view attempts/history
- Update: add progress / mark stuck
- Delete: remove attempt

**Hints** (AI-generated)
- Create: generate hint
- Read: view multi-step hints
- Update: rate usefulness
- Delete: optional

---

## Tech Stack
- **Frontend:** Next.js 14 (App Router) + React  
- **Styling:** Tailwind CSS + shadcn/ui  
- **Backend:** Next.js API routes / Node.js functions  
- **Database:** Supabase (Postgres)  
- **Auth:** Supabase Auth  
- **AI:** OpenAI API or Anthropic Claude API  
- **Hosting:** Vercel  

---

## Conventions & Rules

### Environment Variables
- `.env.local` stores all secrets
- Never commit `.env.local`  

### Styling
- Tailwind utility-first approach
- shadcn/ui components for forms, modals, buttons
- Mobile-first responsive design
- Color tokens in `tailwind.config.js`  

### Supabase & Database
**Row-Level Security:**
- Users can only access their own attempts and hints  
- Use Supabase client via Next.js API routes  

---

## AI Usage
- Only use OpenRouter for all API calls until further notice, mention this anytime you use another AI system, with OpenAI models that are free.

## API / Backend Conventions
- All API routes live in `/app/api/`
- Use server components by default
- Client components only when needed
- Auth handled via Supabase middleware in `middleware.ts`
- Use Supabase auth as much as possible.
- Return JSON consistently
- Handle errors gracefully, with status codes and messages

---

## AI Hint System
- Progressive hints (Level 1 → Level 3)
- Adapt hints based on user skill level
- Never provide full solution
- Store hints in database for each attempt
- Users can rate usefulness
- Hints PREGENERATED via OpenRouter

---

## Current Focus
- Build "paste problem → get AI hints" feature end-to-end
- Ensure hints are saved and retrievable
- Ensure auth, RLS, and basic CRUD work
- Simple, usable UI with minimal distractions

---

## Monetization — Planned (not yet implemented)

Implement in phases. Do not add all at once. Philosophy: start features as paid, move to free later — never the other way.

### Tiers

**Free**
- Core activity (viewing/saving problems) is always unlimited
- 3 complete hint sessions/day — all 3 hints visible per session; daily reset at midnight UTC
- When daily cap hit: Hints 2 & 3 blur (CSS blur + lock icon); quiet one-line CTA + "Resets tomorrow" — no modal, no countdown
- Up to 3 notes created/day (unlimited reading)
- Activity history: last 14 days
- Streak tracking (no freeze)
- No model selection, no solution analysis

**Pro (~$8/mo or $65/yr)**
- Unlimited hint sessions
- Unlimited notes + full activity history
- Model selection
- Unlimited solution analysis
- Streak freeze (1/month)
- XP progression + export notes as markdown

**Elite (~$16/mo or $130/yr)**
- Everything in Pro
- Priority generation (queue skipping)
- Adaptive difficulty (user sets contest level; hints adapt depth/language)
- Hint style: Socratic / Structured / Minimal
- Hint history across attempts (compare past sessions side-by-side)
- Insights dashboard (avg hints needed, weak topics, solve rate by difficulty)
- Weekly email digest

### Implementation Phases
1. **Infra** — Stripe integration, `plan` field on profiles, webhook handler, `getUserPlan()` helper, static `/pricing` page
2. **Hint gating** — daily session counter, blurred hint component, upgrade CTA
3. **Notes & history gating** — daily note creation cap, 14-day activity cutoff for free
4. **Feature locks** — model selection, solution analysis, streak freeze, export (visible but disabled for free)
5. **Elite features** — adaptive difficulty, hint style, insights dashboard, weekly digest email

---

## Performance — Known Issues (as of 2026-05-07)

PostHog web vitals (90th percentile LCP) shows poor scores across key pages:
- `/` — 4.09s (Poor)
- `/profile` — 4.27s (Poor)
- `/display-problem` — 4.93s (Poor)
- `/auth/setup-username` — 5.57s (Poor)
- FCP/LCP on homepage: 8.67s

**Likely causes to investigate:** blocking Supabase fetches before first paint, unoptimized images, large JS bundles, no streaming/Suspense on data-heavy pages.

---

## Workflow Notes for Claude
- Use this CLAUDE.md as **full project context**
- Use it to generate features, API routes, UI components
- Use for testing prompts for AI hint generation
- All rules, conventions, models, and stack are included here
- No additional edits required unless project rules or stack change

---

## Testing & Debugging
- Test API routes with Postman / curl
- Unit test AI hint generation logic
- End-to-end test user flow: login → paste problem → generate hints → rate
- Ensure RLS is enforced
- Test error handling for missing data, invalid URLs, or auth failures
- Everything should have Sentry Error Tracking

---

## Design
- Should be a Techy, black and blue style
- Attracts users right from the landing page
- Should get them to sign up and start even with no experience with the topic
- Do not use many external libraries - use mostly pure CSS
- Make the website look modern and not vibecoded

## Notes
- Keep frontend simple for MVP
- Reuse Supabase client and API routes for future features
- With languages, use Python and C++ instead of python and cpp
- IMPORTANT - after the request is fully done (eg, cooked for 50s), tell me how many tokens were used by the request and how many I have left. Aim to minimize this.
