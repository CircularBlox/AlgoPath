import { displayTag } from "~/lib/tags";

const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 92;
const LABEL_R = 118;

function pt(r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function polyPts(n: number, r: number) {
  const step = 360 / n;
  return Array.from({ length: n }, (_, i) => {
    const p = pt(r, step * i);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ");
}

export function TopicRadar({
  tags,
  maxCount,
}: {
  tags: [string, number][];
  maxCount: number;
}) {
  const n = tags.length;
  if (n < 3) return null;

  const step = 360 / n;

  const skillPts = tags
    .map(([, count], i) => {
      const frac = Math.max(0.06, count / maxCount);
      const p = pt(MAX_R * frac, step * i);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width="100%"
        viewBox="-50 -45 360 350"
        style={{ maxWidth: 360 }}
        aria-label="Topic strength radar"
      >
        {/* Outer grid background */}
        <polygon
          points={polyPts(n, MAX_R)}
          fill="currentColor"
          fillOpacity={0.03}
          className="text-foreground"
        />

        {/* Grid rings at 25 / 50 / 75 / 100% */}
        {[0.25, 0.5, 0.75, 1].map((frac, ri) => (
          <polygon
            key={frac}
            points={polyPts(n, MAX_R * frac)}
            fill="none"
            stroke="currentColor"
            strokeWidth={ri === 3 ? "1" : "0.5"}
            opacity={ri === 3 ? 0.4 : 0.2}
            className="text-border"
          />
        ))}

        {/* Axis spokes */}
        {tags.map(([tag], i) => {
          const outer = pt(MAX_R, step * i);
          return (
            <line
              key={`spoke-${tag}`}
              x1={CX}
              y1={CY}
              x2={outer.x.toFixed(2)}
              y2={outer.y.toFixed(2)}
              stroke="currentColor"
              strokeWidth="0.5"
              opacity={0.25}
              className="text-border"
            />
          );
        })}

        {/* User skill fill */}
        <polygon
          points={skillPts}
          fill="currentColor"
          fillOpacity={0.16}
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity={0.9}
          className="text-violet"
        />

        {/* Vertex dots */}
        {tags.map(([tag, count], i) => {
          const frac = Math.max(0.06, count / maxCount);
          const p = pt(MAX_R * frac, step * i);
          return (
            <circle
              key={`dot-${tag}`}
              cx={p.x.toFixed(2)}
              cy={p.y.toFixed(2)}
              r="3.5"
              fill="currentColor"
              className="text-violet"
            />
          );
        })}

        {/* Labels */}
        {tags.map(([tag], i) => {
          const p = pt(LABEL_R, step * i);
          const anchor =
            p.x > CX + 10 ? "start" : p.x < CX - 10 ? "end" : "middle";
          const name = displayTag(tag);
          const words = name.split(" ");
          const isMulti = words.length > 1;
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(" ");
          const line2 = isMulti ? words.slice(mid).join(" ") : null;

          return (
            <text
              key={tag}
              x={p.x.toFixed(2)}
              y={p.y.toFixed(2)}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="9"
              fill="currentColor"
              fillOpacity={0.65}
              className="text-foreground"
            >
              <tspan x={p.x.toFixed(2)} dy={isMulti ? "-0.55em" : "0"}>
                {line1}
              </tspan>
              {line2 && (
                <tspan x={p.x.toFixed(2)} dy="1.15em">
                  {line2}
                </tspan>
              )}
            </text>
          );
        })}
      </svg>

      <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
        Each axis is a topic. The further from center, the more you've solved
        there — your skill web at a glance.
      </p>
    </div>
  );
}
