# CLAUDE.md

## Project Overview
This is a Next.js + Supabase app for competitive programmers that helps them get AI-generated, adaptive, step-by-step hints on problems they are working on. Users can paste a problem URL and their current attempt (code or notes), and receive 3 progressive hints to guide them without giving the full solution.  

**Target users:** Competitive programmers who are stuck on coding problems, from intermediate LeetCode users to top contest participants.  

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
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY` (or Claude API key)
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
- Only use OpenRouter for all API calls until further notice, mention this anytime you use another AI system. For example, do not use Anthropic or OpenAI APIs.

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
- Hints generated via OpenAI or Claude API

---

## Current Focus
- Build "paste problem → get AI hints" feature end-to-end
- Ensure hints are saved and retrievable
- Ensure auth, RLS, and basic CRUD work
- Simple, usable UI with minimal distractions

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

---

## Notes
- Focus on incremental feature building
- Start with attempt + hint flow
- Expand to notes, ratings, skill-level adjustments later
- Keep frontend simple for MVP
- Reuse Supabase client and API routes for future features
- With languages, use Python and C++ instead of python and cpp
- IMPORTANT - after the request is fully done (eg, cooked for 50s), tell me how many tokens were used by the request and how many I have left. Aim to minimize this.