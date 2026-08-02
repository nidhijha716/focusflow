import type { Metadata } from "next";
import { StopwatchView } from "./StopwatchView";

export const metadata: Metadata = {
  title: "Stopwatch",
  description:
    "A free, no-signup stopwatch for open-ended tasks -- start, pause, resume and reset an elapsed-time clock independent of the Pomodoro timer.",
  alternates: {
    canonical: "/stopwatch",
  },
};

/**
 * Dedicated stopwatch route (POM-035). `components/stopwatch/Stopwatch.tsx`
 * was previously only reachable by toggling a panel on the home page
 * (app/page.tsx); this gives it its own linkable, indexable URL with
 * unique metadata, without changing the component itself.
 */
export default function StopwatchPage() {
  return <StopwatchView />;
}
