"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CloseIcon, MusicIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { audioService } from "@/services/audio.service";
import { useSettingsStore } from "@/stores/settings.store";

interface MusicTrack {
  id: string;
  name: string;
  src: string;
}

/**
 * Placeholder catalog -- no licensed ambient-audio assets exist yet (same
 * status as `ALARM_SOUND_SRC` in constants/timer.constants.ts). `src` paths
 * are wired for real playback through `services/audio.service.ts` already;
 * once licensed files land at these paths under `public/sounds/ambient/`,
 * playback starts working with no further code changes. Until then,
 * `audioService.play`'s `.catch(() => {})` degrades a missing-file rejection
 * to a silent no-op instead of a broken player.
 */
const TRACKS: MusicTrack[] = [
  { id: "rain", name: "Rain", src: "/sounds/ambient/rain.mp3" },
  { id: "cafe", name: "Cafe ambience", src: "/sounds/ambient/cafe.mp3" },
  { id: "brown-noise", name: "Brown noise", src: "/sounds/ambient/brown-noise.mp3" },
  { id: "lofi", name: "Lo-fi loop", src: "/sounds/ambient/lofi.mp3" },
];

export interface MusicPlayerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * `MusicPlayer` -- track and volume controls (doc
 * 05_Frontend_Specification.pdf section 4). Wired to the real
 * `services/audio.service.ts` play/stop/setVolume contract (Phase 4
 * scope) -- selecting a track preloads + plays it looped at the current
 * `musicVolume`; switching tracks stops the previous one first so at most
 * one plays at a time; no licensed asset files exist yet (see `TRACKS`),
 * so playback currently degrades to a silent no-op rather than erroring,
 * while every control still works exactly as it will once real files are
 * added. Volume persists immediately through the existing
 * `useSettingsStore.setMusicVolume` setter, the same store `SettingsDialog`
 * writes to, and is applied live to whichever track is currently playing.
 */
export function MusicPlayer({ open, onClose }: MusicPlayerProps) {
  const titleId = useId();
  const musicVolume = useSettingsStore((state) => state.musicVolume);
  const setMusicVolume = useSettingsStore((state) => state.setMusicVolume);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying || !selectedTrackId) return;
    audioService.setVolume(selectedTrackId, musicVolume);
  }, [musicVolume, isPlaying, selectedTrackId]);

  function playTrack(trackId: string) {
    const track = TRACKS.find((candidate) => candidate.id === trackId);
    if (!track) return;
    audioService.preload(track.id, track.src);
    audioService.play(track.id, { loop: true, volume: musicVolume });
  }

  function handleTrackClick(trackId: string) {
    if (selectedTrackId === trackId) {
      if (isPlaying) {
        audioService.stop(trackId);
        setIsPlaying(false);
      } else {
        playTrack(trackId);
        setIsPlaying(true);
      }
      return;
    }
    if (selectedTrackId) audioService.stop(selectedTrackId);
    setSelectedTrackId(trackId);
    playTrack(trackId);
    setIsPlaying(true);
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="text-lg font-semibold text-text-primary">
          Ambient sound
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close ambient sound">
          <CloseIcon className="size-5" />
        </Button>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {TRACKS.map((track) => {
          const active = track.id === selectedTrackId;
          return (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => handleTrackClick(track.id)}
                aria-pressed={active && isPlaying}
                className={cn(
                  "control flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium",
                  active ? "border-focus bg-surface-soft text-text-primary" : "border-border text-text-secondary"
                )}
              >
                {active && isPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
                {track.name}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5">
        <label htmlFor={`${titleId}-volume`} className="flex items-center justify-between text-sm text-text-secondary">
          <span className="flex items-center gap-1.5">
            <MusicIcon className="size-4" /> Volume
          </span>
          <span className="tabular-nums">{Math.round(musicVolume * 100)}%</span>
        </label>
        <input
          id={`${titleId}-volume`}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={musicVolume}
          onChange={(event) => setMusicVolume(Number(event.target.value))}
          className="control mt-2 w-full accent-focus"
        />
      </div>
    </Dialog>
  );
}
