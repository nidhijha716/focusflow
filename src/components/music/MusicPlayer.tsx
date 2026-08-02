"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CloseIcon, MusicIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";
import { SpotifyTrackSearch } from "@/components/spotify/SpotifyTrackSearch";
import { cn } from "@/lib/cn";
import { toSpotifyTrackRef } from "@/lib/spotify/api";
import { getValidSpotifyAccessToken } from "@/lib/spotify/auth";
import type { SpotifyTrack } from "@/lib/spotify/types";
import { audioService } from "@/services/audio.service";
import { pauseSpotifyPlayback, playSpotifyTrack, resumeSpotifyPlayback, setSpotifyVolume, stopSpotifyPlayback } from "@/services/spotifyPlayback.service";
import { useSettingsStore } from "@/stores/settings.store";

interface MusicTrack {
  id: string;
  name: string;
  src: string;
}

const TRACKS: MusicTrack[] = [
  { id: "rain", name: "Rain", src: "/sounds/ambient/rain.mp3" },
  { id: "cafe", name: "Cafe ambience", src: "/sounds/ambient/cafe.mp3" },
  { id: "brown-noise", name: "Brown noise", src: "/sounds/ambient/brown-noise.mp3" },
  { id: "lofi", name: "Lo-fi loop", src: "/sounds/ambient/lofi.mp3" },
];

type SoundSource = "builtin" | "spotify";

export interface MusicPlayerProps {
  open: boolean;
  onClose: () => void;
}

export function MusicPlayer({ open, onClose }: MusicPlayerProps) {
  const titleId = useId();
  const musicVolume = useSettingsStore((state) => state.musicVolume);
  const setMusicVolume = useSettingsStore((state) => state.setMusicVolume);
  const spotifyAmbientTrack = useSettingsStore((state) => state.spotifyAmbientTrack);
  const setSpotifyAmbientTrack = useSettingsStore((state) => state.setSpotifyAmbientTrack);

  const [source, setSource] = useState<SoundSource>(spotifyAmbientTrack ? "spotify" : "builtin");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying || !selectedTrackId || source !== "builtin") return;
    audioService.setVolume(selectedTrackId, musicVolume);
  }, [musicVolume, isPlaying, selectedTrackId, source]);

  useEffect(() => {
    if (!spotifyPlaying || source !== "spotify") return;
    void setSpotifyVolume(musicVolume);
  }, [musicVolume, spotifyPlaying, source]);

  function playBuiltinTrack(trackId: string) {
    const track = TRACKS.find((candidate) => candidate.id === trackId);
    if (!track) return;
    audioService.preload(track.id, track.src);
    audioService.play(track.id, { loop: true, volume: musicVolume });
  }

  function handleBuiltinTrackClick(trackId: string) {
    void stopSpotifyPlayback();
    setSpotifyPlaying(false);

    if (selectedTrackId === trackId) {
      if (isPlaying) {
        audioService.stop(trackId);
        setIsPlaying(false);
      } else {
        playBuiltinTrack(trackId);
        setIsPlaying(true);
      }
      return;
    }
    if (selectedTrackId) audioService.stop(selectedTrackId);
    setSelectedTrackId(trackId);
    playBuiltinTrack(trackId);
    setIsPlaying(true);
  }

  async function handleSpotifySelect(track: SpotifyTrack) {
    audioService.stopAll();
    setSelectedTrackId(null);
    setIsPlaying(false);

    setSpotifyAmbientTrack(toSpotifyTrackRef(track));
    const token = await getValidSpotifyAccessToken();
    if (!token) return;

    try {
      await playSpotifyTrack(track.uri, musicVolume);
      setSpotifyPlaying(true);
    } catch {
      setSpotifyPlaying(false);
    }
  }

  async function toggleSpotifyPlayback() {
    if (!spotifyAmbientTrack) return;
    if (spotifyPlaying) {
      await pauseSpotifyPlayback();
      setSpotifyPlaying(false);
      return;
    }
    await resumeSpotifyPlayback();
    setSpotifyPlaying(true);
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

      <div className="mt-4 flex gap-2" role="tablist" aria-label="Sound source">
        {(["builtin", "spotify"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={source === option}
            onClick={() => setSource(option)}
            className={cn(
              "control flex-1 rounded-pill border px-3 py-2 text-sm font-medium",
              source === option ? "border-focus text-focus" : "border-border text-text-secondary"
            )}
          >
            {option === "builtin" ? "Built-in" : "Spotify"}
          </button>
        ))}
      </div>

      {source === "builtin" ? (
        <ul className="mt-4 flex flex-col gap-2">
          {TRACKS.map((track) => {
            const active = track.id === selectedTrackId;
            return (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={() => handleBuiltinTrackClick(track.id)}
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
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <SpotifyTrackSearch
            label="Search Spotify"
            selectedUri={spotifyAmbientTrack?.uri ?? null}
            onSelect={(track) => void handleSpotifySelect(track)}
            onClear={() => {
              void stopSpotifyPlayback();
              setSpotifyAmbientTrack(null);
              setSpotifyPlaying(false);
            }}
          />
          {spotifyAmbientTrack ? (
            <div className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm">
              <p className="font-medium text-text-primary">{spotifyAmbientTrack.name}</p>
              <p className="text-xs text-text-secondary">{spotifyAmbientTrack.artist}</p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => void toggleSpotifyPlayback()}>
                {spotifyPlaying ? "Pause" : "Play"}
              </Button>
            </div>
          ) : null}
          <p className="text-xs text-text-secondary">Spotify playback requires Premium.</p>
        </div>
      )}

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
