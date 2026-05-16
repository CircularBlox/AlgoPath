/**
 * Returns the set of difficulty strings to match for a given user rating.
 *
 * Covers CF numeric ratings within ±200 of the user's rating (multiples of 100)
 * plus the corresponding LeetCode bucket ("Easy" / "Medium" / "Hard").
 *
 * Example: rating 1400 → ["1200","1300","1400","1500","1600","Medium"]
 */
export function difficultyBuckets(rating: number): string[] {
  const lower = Math.max(400, rating - 200);
  const upper = Math.min(3500, rating + 200);

  const cfRatings: string[] = [];
  for (let r = Math.ceil(lower / 100) * 100; r <= upper; r += 100) {
    cfRatings.push(String(r));
  }

  const lcBucket = rating < 1300 ? "Easy" : rating < 2000 ? "Medium" : "Hard";

  return [...cfRatings, lcBucket];
}

/** Human-readable label for the difficulty window around a rating. */
export function difficultyLabel(rating: number): string {
  if (rating < 1300) return "beginner-friendly";
  if (rating < 1800) return "intermediate";
  if (rating < 2400) return "advanced";
  return "expert";
}
