# Memory Index

## User
- [User profile](user_profile.md) — developer comfortable with the stack, prefers autonomous execution over check-ins

## Feedback
- [Implementation completeness](feedback_implementation_completeness.md) — complete tasks end-to-end with no follow-up prompting needed
- [No centralized scripts](feedback_no_centralized_scripts.md) — inline error handling per-file; single shared script explicitly NOT PREFERRED
- [Don't stop mid-task](feedback_finish_current_task.md) — execute large tasks fully without pausing to check in
- [Middleware tunnel bypass](feedback_middleware_tunnel_bypass.md) — tunnelRoute configs (e.g. Sentry /monitoring) always need a middleware early-return exemption
- [Lockfile fixes must be comprehensive](feedback_lockfile_fixes.md) — regenerate fully, check all deps, commit package.json + lockfile together
- [Third-party wizard tokens](feedback_third_party_wizard_tokens.md) — anticipate that external tokens/wizard output must come from user; explain format upfront
