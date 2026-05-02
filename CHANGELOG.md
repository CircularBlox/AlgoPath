# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

---

## [Unreleased]

### Removed
- `problem_views` table and view-tracking feature (`POST /api/problems/[number]/view`, view useEffect, view timestamps, "Views" in activity page)

### Added
- **Resume feature**: "Continue where you left off" section on the Practice page shows up to 5 recently attempted (notes/AI reviews) unsolved problems (`GET /api/problems/recent`)
- **Skip warning**: Clicking Skip or Find Random Problem while viewing a problem shows a small inline amber warning — "Skipping counts as giving up this problem" — with Skip anyway / Cancel

### Changed
- Activity page and API no longer track or display problem views; stats strip is now 3-column (Solves, Notes, AI Reviews)
- `GET /api/problems/[number]/view` now returns only solve status (`{ solve: ... }`) instead of view+solve data
