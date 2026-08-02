import type { DailyStats } from "@/types/dailyStats";
import { emptyDailyStats } from "@/types/dailyStats";
import { todayLocalDateString } from "@/types/localDate";

export interface StatsViewProps {
  stats?: DailyStats;
}

function formatFocusDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * `StatsView` -- daily focus and session totals (doc
 * 05_Frontend_Specification.pdf section 4). Deliberately a handful of plain
 * stat tiles rather than a card-per-metric dashboard -- doc 08 section 13:
 * "secondary information should not create a dashboard-like wall of cards"
 * -- and grid-responsive per doc 08 section 16 ("Stats: 1-2 columns mobile
 * -> 2-3 tablet -> 3-4 compact desktop").
 *
 * Reads the real `DailyStats` shape (`@/types/dailyStats`, IndexedDB
 * `dailyStats` store) as a prop -- `app/page.tsx` supplies it from
 * `stores/stats.store.ts`, which reads the `dailyStats` repository (Phase 4
 * wiring). Defaults to an empty day so a not-yet-loaded/first-run state
 * never shows fabricated totals.
 */
export function StatsView({ stats = emptyDailyStats(todayLocalDateString()) }: StatsViewProps) {
  const tiles = [
    { label: "Focus time", value: formatFocusDuration(stats.focusSeconds) },
    { label: "Focus sessions", value: String(stats.focusSessions) },
    { label: "Short breaks", value: String(stats.shortBreaks) },
    { label: "Long breaks", value: String(stats.longBreaks) },
  ];

  return (
    <div className="w-full">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Today</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg bg-surface-soft px-4 py-3">
            <p className="text-2xl font-semibold tabular-nums text-text-primary">{tile.value}</p>
            <p className="text-xs text-text-secondary">{tile.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
