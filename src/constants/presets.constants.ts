/**
 * SEO preset timer routes (POM-036). Each entry becomes a statically
 * generated `/presets/[preset]` page with its own metadata/canonical and a
 * short, genuinely-different paragraph of copy per doc 07's VAL requirement
 * for "unique metadata/canonical/content for public routes" -- these are
 * plain, factual descriptions of each duration's typical use, not filler
 * text repeated across pages with the number swapped.
 */
export interface TimerPresetDefinition {
  /** URL segment: `/presets/{slug}`. */
  slug: string;
  minutes: 5 | 15 | 20 | 25;
  title: string;
  description: string;
  intro: string;
}

export const TIMER_PRESETS: readonly TimerPresetDefinition[] = [
  {
    slug: "5",
    minutes: 5,
    title: "5 Minute Timer",
    description:
      "A free 5 minute focus timer for quick tasks, short warm-ups, or a single tight sprint between meetings.",
    intro:
      "Five minutes is long enough for one clearly-scoped task -- clearing a small inbox, a quick stretch break, or a warm-up rep before a longer focus block -- and short enough that starting never feels like a big commitment.",
  },
  {
    slug: "15",
    minutes: 15,
    title: "15 Minute Timer",
    description:
      "A free 15 minute focus timer for short, high-intensity work sessions when a full 25-minute Pomodoro is more than you need.",
    intro:
      "Fifteen minutes suits a single email reply, a focused reading pass, or a quick design review -- enough time to make real progress without the session outlasting the task.",
  },
  {
    slug: "20",
    minutes: 20,
    title: "20 Minute Timer",
    description:
      "A free 20 minute focus timer, a popular middle ground between a quick sprint and a full Pomodoro interval.",
    intro:
      "Twenty minutes gives you room to get into a task -- drafting a document, working through a small bug, or a focused study block -- while still keeping the session short enough to sustain full attention throughout.",
  },
  {
    slug: "25",
    minutes: 25,
    title: "25 Minute Timer",
    description:
      "The classic 25 minute Pomodoro focus timer, followed by short and long breaks on the standard four-cycle schedule.",
    intro:
      "Twenty-five minutes is the original Pomodoro Technique interval: long enough for deep, uninterrupted focus on a single task, short enough to keep four cycles a day sustainable before a longer break.",
  },
];

export function findTimerPreset(slug: string): TimerPresetDefinition | undefined {
  return TIMER_PRESETS.find((preset) => preset.slug === slug);
}
