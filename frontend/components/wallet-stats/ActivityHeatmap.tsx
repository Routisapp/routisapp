"use client";

import { useMemo } from "react";

interface ActivityHeatmapProps {
  heatmap:   Record<string, number>;
  isLoading: boolean;
}

// Build a 53-week grid (Sun→Sat) ending today
function buildGrid(): string[][] {
  const today    = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the start: 52 full weeks back, aligned to Sunday
  const end       = new Date(today);
  const startDay  = new Date(today);
  startDay.setDate(startDay.getDate() - 52 * 7 - startDay.getDay());

  const weeks: string[][] = [];
  let current = new Date(startDay);

  while (current <= end) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(current <= end ? current.toISOString().slice(0, 10) : "");
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Map count → intensity 0-4
function intensity(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3)  return 2;
  if (count <= 7)  return 3;
  return 4;
}

const COLORS = [
  "var(--bg-input)",    // 0 — none
  "#F5D5B8",            // 1 — lightest
  "#E8A87C",            // 2
  "#D97A3F",            // 3
  "#B55A2E",            // 4 — darkest
];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS   = ["S","M","T","W","T","F","S"];

export function ActivityHeatmap({ heatmap, isLoading }: ActivityHeatmapProps) {
  const weeks = useMemo(() => buildGrid(), []);

  const totalTxs   = Object.values(heatmap).reduce((a, b) => a + b, 0);
  const activeDays = Object.keys(heatmap).length;

  // Month label positions: find first week where month changes
  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const firstDay = week.find(d => d !== "");
    if (!firstDay) return;
    const m = new Date(firstDay).getMonth();
    if (m !== lastMonth) {
      monthPositions.push({ label: MONTH_LABELS[m], col });
      lastMonth = m;
    }
  });

  const CELL_SIZE = 11;
  const GAP       = 2;
  const cols      = weeks.length;
  const svgW      = cols * (CELL_SIZE + GAP);
  const svgH      = 7 * (CELL_SIZE + GAP) + 16; // +16 for month labels

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-card] p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[--text-secondary]">
        Transaction Activity
      </p>
      {/* Summary row */}
      <p className="mb-3 text-xs text-[--text-secondary]">
        {isLoading ? (
          <span className="inline-block h-3 w-48 rounded bg-[--border] animate-pulse" />
        ) : (
          <>{activeDays} active days · {totalTxs} txs in last 12 months</>
        )}
      </p>

      {/* Heatmap — horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-0.5 pt-4">
            {DAY_LABELS.map((d, i) => (
              <div key={i} className="text-[8px] text-[--text-secondary] leading-none"
                   style={{ height: CELL_SIZE, display: "flex", alignItems: "center" }}>
                {i % 2 === 1 ? d : ""}
              </div>
            ))}
          </div>

          {/* SVG grid */}
          <div style={{ position: "relative" }}>
            {/* Month labels */}
            <div style={{ display: "flex", height: 14, marginBottom: 2, position: "relative" }}>
              {monthPositions.map(({ label, col }) => (
                <span
                  key={label + col}
                  className="text-[8px] text-[--text-secondary] absolute"
                  style={{ left: col * (CELL_SIZE + GAP) }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Cells */}
            <div style={{ display: "flex", gap: GAP }}>
              {isLoading
                ? Array.from({ length: cols }).map((_, ci) => (
                    <div key={ci} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                      {Array.from({ length: 7 }).map((_, ri) => (
                        <div
                          key={ri}
                          style={{
                            width: CELL_SIZE, height: CELL_SIZE,
                            borderRadius: 2,
                            background: "var(--border)",
                            opacity: 0.4 + Math.random() * 0.3,
                          }}
                        />
                      ))}
                    </div>
                  ))
                : weeks.map((week, ci) => (
                    <div key={ci} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                      {week.map((day, ri) => {
                        const count = day ? (heatmap[day] ?? 0) : 0;
                        const level = day ? intensity(count) : 0;
                        return (
                          <div
                            key={ri}
                            title={day ? `${day}: ${count} tx` : ""}
                            style={{
                              width:        CELL_SIZE,
                              height:       CELL_SIZE,
                              borderRadius: 2,
                              background:   day ? COLORS[level] : "transparent",
                              cursor:       count > 0 ? "default" : "default",
                            }}
                          />
                        );
                      })}
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-1.5 justify-end">
        <span className="text-[9px] text-[--text-secondary]">Less</span>
        {COLORS.map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span className="text-[9px] text-[--text-secondary]">More</span>
      </div>
    </div>
  );
}
