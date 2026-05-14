/**
 * Canonical mapping: DB tag (lowercase, as stored) → display label.
 * Covers CF standard tags and common LC categories.
 */
const DB_TO_DISPLAY: Record<string, string> = {
  dp: "Dynamic Programming",
  bfs: "BFS",
  dfs: "DFS",
  dsu: "DSU / Union Find",
  "disjoint set union": "DSU / Union Find",
  mst: "Minimum Spanning Tree",
  "minimum spanning tree": "Minimum Spanning Tree",
  graphs: "Graphs",
  graph: "Graphs",
  "graph theory": "Graph Theory",
  trees: "Trees",
  tree: "Trees",
  greedy: "Greedy",
  implementation: "Implementation",
  math: "Math",
  mathematics: "Math",
  "number theory": "Number Theory",
  combinatorics: "Combinatorics",
  "binary search": "Binary Search",
  "two pointers": "Two Pointers",
  "sliding window": "Sliding Window",
  string: "Strings",
  strings: "Strings",
  "string matching": "String Matching",
  arrays: "Arrays",
  array: "Arrays",
  "data structures": "Data Structures",
  sortings: "Sorting",
  sorting: "Sorting",
  "brute force": "Brute Force",
  geometry: "Geometry",
  hashing: "Hashing",
  "bit manipulation": "Bit Manipulation",
  "divide and conquer": "Divide and Conquer",
  "shortest paths": "Shortest Paths",
  backtracking: "Backtracking",
  recursion: "Recursion",
  stack: "Stack",
  queue: "Queue",
  heap: "Heap",
  "priority queue": "Priority Queue",
  "linked list": "Linked List",
  matrix: "Matrix",
  simulation: "Simulation",
  "constructive algorithms": "Constructive Algorithms",
  "segment tree": "Segment Tree",
  "binary indexed tree": "Binary Indexed Tree",
  trie: "Trie",
  "topological sort": "Topological Sort",
  "network flow": "Network Flow",
  flows: "Network Flow",
  "dynamic connectivity": "Dynamic Connectivity",
};

/**
 * Reverse aliases: any reasonable user/AI input → DB tag (lowercase).
 * Keys are lowercased before lookup.
 */
const ALIAS_TO_DB: Record<string, string> = {
  "dynamic programming": "dp",
  "dynamic-programming": "dp",
  "depth first search": "dfs",
  "depth-first search": "dfs",
  "depth-first-search": "dfs",
  "breadth first search": "bfs",
  "breadth-first search": "bfs",
  "breadth-first-search": "bfs",
  "union find": "dsu",
  "union-find": "dsu",
  graph: "graphs",
  tree: "trees",
  array: "arrays",
  string: "strings",
  sorting: "sortings",
  "network flow": "flows",
  mathematics: "math",
  "bit ops": "bit manipulation",
  bitwise: "bit manipulation",
  "priority queue": "heap",
};

/** Returns the human-readable display label for a tag. */
export function displayTag(tag: string): string {
  const key = tag.toLowerCase().trim();
  if (DB_TO_DISPLAY[key]) return DB_TO_DISPLAY[key];
  // Title-case fallback for unknown tags
  return key
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Normalizes user/AI input to the DB tag form (lowercase, abbreviated). */
export function normalizeToDbTag(input: string): string {
  const key = input.toLowerCase().trim();
  return ALIAS_TO_DB[key] ?? key;
}
