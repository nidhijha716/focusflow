"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { TimerHero } from "@/components/timer/TimerHero";
import { StatsView } from "@/components/stats/StatsView";
import { StreakIndicator } from "@/components/stats/StreakIndicator";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { Stopwatch } from "@/components/stopwatch/Stopwatch";
import { Button } from "@/components/ui/Button";
import { MusicIcon, ImageIcon, StopwatchIcon } from "@/components/ui/icons";
import { DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS } from "@/services/challenge.service";
import { useStatsStore } from "@/stores/stats.store";

// Every dialog/panel below is opened on demand (a button toggle, never the
// first paint) and each pulls in its own non-trivial subtree (task tree
// recursion, settings form, per-track/per-swatch asset catalogs, the
// Document Picture-in-Picture + createPortal machinery) -- code-split them
// so the timer-first hero above never waits on any of that bundle weight
// (doc 05_Frontend_Specification.pdf section 11: "Lazy-load heavy
// audio/background assets"; Technical Architecture doc §10: "Keep
// first-load JavaScript ... controlled"; pattern from
// node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md).
const MusicPlayer = dynamic(() => import("@/components/music/MusicPlayer").then((mod) => mod.MusicPlayer));
const BackgroundPicker = dynamic(() =>
  import("@/components/background/BackgroundPicker").then((mod) => mod.BackgroundPicker)
);
const SettingsDialog = dynamic(() => import("@/components/settings/SettingsDialog").then((mod) => mod.SettingsDialog));
const TaskPanel = dynamic(() => import("@/components/tasks/TaskPanel").then((mod) => mod.TaskPanel));
const PiPTimer = dynamic(() => import("@/components/pip/PiPTimer").then((mod) => mod.PiPTimer));

type UtilityPanel = "music" | "background" | "stopwatch" | null;

/**
 * First real composition of the Phase 3 UI layer. Timer-first hero (mode
 * selector -> countdown -> primary controls) fills the first viewport with
 * no card clutter, matching doc 08 section 13's "should not create a
 * dashboard-like wall of cards"; stats/streak/challenge live below the
 * fold as a handful of slim modules, not a dashboard grid.
 */
export default function Home() {
  const [tasksOpen, setTasksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<UtilityPanel>(null);

  const dailyStats = useStatsStore((state) => state.dailyStats);
  const streak = useStatsStore((state) => state.streak);
  const refreshStats = useStatsStore((state) => state.refreshAll);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  function toggleUtilityPanel(panel: UtilityPanel) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  return (
    <AppShell
      header={
        <Header
          streakSlot={<StreakIndicator streak={streak} compact />}
          onOpenTasks={() => setTasksOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      }
    >
      <section className="flex flex-1 flex-col items-center justify-center gap-8 py-10 sm:py-16">
        <TimerHero />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="ghost" size="sm" aria-pressed={activePanel === "music"} onClick={() => toggleUtilityPanel("music")}>
            <MusicIcon className="size-4" />
            Spotify
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={activePanel === "background"}
            onClick={() => toggleUtilityPanel("background")}
          >
            <ImageIcon className="size-4" />
            Background
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={activePanel === "stopwatch"}
            onClick={() => toggleUtilityPanel("stopwatch")}
          >
            <StopwatchIcon className="size-4" />
            Stopwatch
          </Button>
          <PiPTimer />
        </div>

        {activePanel === "stopwatch" ? (
          <div className="rounded-lg border border-border bg-surface-soft px-6 py-5">
            <Stopwatch />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-6 pb-12 sm:pb-16">
        <ChallengeCard
          progress={dailyStats.focusSessions}
          target={DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS}
          completed={dailyStats.focusSessions >= DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS}
        />
        <StatsView stats={dailyStats} />
      </section>

      <TaskPanel open={tasksOpen} onClose={() => setTasksOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <MusicPlayer open={activePanel === "music"} onClose={() => setActivePanel(null)} />
      <BackgroundPicker open={activePanel === "background"} onClose={() => setActivePanel(null)} />
    </AppShell>
  );
}
