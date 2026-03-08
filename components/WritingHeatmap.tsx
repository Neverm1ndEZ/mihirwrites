"use client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

interface HeatmapProps {
  year: number;
  // Map of "YYYY-MM-DD" -> post count
  data: Record<string, number>;
}

function getColorForCount(count: number): string {
  if (count === 0) return "var(--bg-secondary)";
  if (count === 1) return "color-mix(in srgb, var(--accent) 30%, var(--bg-secondary))";
  if (count === 2) return "color-mix(in srgb, var(--accent) 55%, var(--bg-secondary))";
  return "var(--accent)";
}

export default function WritingHeatmap({ year, data }: HeatmapProps) {
  // Build all days of the year
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);
  const days: { date: string; count: number; month: number }[] = [];

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const key = cur.toISOString().slice(0, 10);
    days.push({
      date: key,
      count: data[key] || 0,
      month: cur.getMonth(),
    });
    cur.setDate(cur.getDate() + 1);
  }

  // Figure out first day-of-week offset (0=Sun)
  const firstDow = startDate.getDay();
  const paddedDays = [
    ...Array.from({ length: firstDow }, () => null),
    ...days,
  ];

  // Build weeks (columns of 7)
  const weeks: (typeof days[0] | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  const total = days.reduce((s, d) => s + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--fg)" }}>Writing Heatmap</h2>
        <span style={{ fontSize: "0.75rem", color: "var(--fg-subtle)" }}>
          {total} post{total !== 1 ? "s" : ""} across {activeDays} day{activeDays !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Month labels */}
      <div style={{ overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div style={{ display: "flex", gap: "2px", alignItems: "flex-start", minWidth: "fit-content" }}>
          {/* Day labels */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginRight: "4px", paddingTop: "18px" }}>
            {DAYS.map((d, i) => (
              <div key={i} style={{ height: "11px", fontSize: "0.5625rem", color: "var(--fg-subtle)", lineHeight: "11px", textAlign: "right", width: "20px" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div>
            {/* Month labels row */}
            <div style={{ display: "flex", gap: "2px", marginBottom: "2px" }}>
              {weeks.map((week, wi) => {
                const firstReal = week.find((d) => d !== null);
                const showMonth = firstReal && (wi === 0 || firstReal.date.endsWith("-01"));
                return (
                  <div key={wi} style={{ width: "11px", fontSize: "0.5625rem", color: "var(--fg-subtle)", whiteSpace: "nowrap", overflow: "visible" }}>
                    {showMonth ? MONTHS[firstReal!.month] : ""}
                  </div>
                );
              })}
            </div>

            {/* Grid */}
            <div style={{ display: "flex", gap: "2px" }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      title={day ? `${day.date}: ${day.count} post${day.count !== 1 ? "s" : ""}` : ""}
                      style={{
                        width: "11px",
                        height: "11px",
                        borderRadius: "2px",
                        background: day ? getColorForCount(day.count) : "transparent",
                        border: day ? "1px solid color-mix(in srgb, var(--border) 80%, transparent)" : "none",
                        transition: "transform 0.1s",
                        cursor: day && day.count > 0 ? "pointer" : "default",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (day && day.count > 0) (e.currentTarget as HTMLDivElement).style.transform = "scale(1.4)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.625rem" }}>
        <span style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)" }}>Less</span>
        {[0, 1, 2, 3].map((n) => (
          <div key={n} style={{ width: "11px", height: "11px", borderRadius: "2px", background: getColorForCount(n), border: "1px solid color-mix(in srgb, var(--border) 80%, transparent)" }} />
        ))}
        <span style={{ fontSize: "0.6875rem", color: "var(--fg-subtle)" }}>More</span>
      </div>
    </div>
  );
}
