"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CloseIcon, MusicIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";
import { SpotifyConnectButton } from "@/components/spotify/SpotifyConnectButton";
import { SpotifyTrackSearch } from "@/components/spotify/SpotifyTrackSearch";
import { toSpotifyTrackRef } from "@/lib/spotify/api";
import { getValidSpotifyAccessToken } from "@/lib/spotify/auth";
import type { SpotifyTrack } from "@/lib/spotify/types";
import {
  pauseSpotifyPlayback,
  playSpotifyTrack,
  resumeSpotifyPlayback,
  setSpotifyVolume,
  stopSpotifyPlayback,
} from "@/services/spotifyPlayback.service";
import { useSettingsStore } from "@/stores/settings.store";

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

  const [connected, setConnected] = useState(false);
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    if (!spotifyPlaying) return;
    void setSpotifyVolume(musicVolume);
  }, [musicVolume, spotifyPlaying]);

  async function handleSpotifySelect(track: SpotifyTrack) {
    setPlaybackError(null);
    setSpotifyAmbientTrack(toSpotifyTrackRef(track));
    const token = await getValidSpotifyAccessToken();
    if (!token) {
      setPlaybackError("Connect Spotify before playing.");
      return;
    }

    try {
      await playSpotifyTrack(track.uri, musicVolume);
      setSpotifyPlaying(true);
    } catch (error) {
      setSpotifyPlaying(false);
      setPlaybackError(error instanceof Error ? error.message : "Could not start playback.");
    }
  }

  async function toggleSpotifyPlayback() {
    if (!spotifyAmbientTrack) return;
    setPlaybackError(null);
    if (spotifyPlaying) {
      await pauseSpotifyPlayback();
      setSpotifyPlaying(false);
      return;
    }
    try {
      await resumeSpotifyPlayback();
      setSpotifyPlaying(true);
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "Could not resume playback.");
    }
  }

  async function handleClearTrack() {
    await stopSpotifyPlayback();
    setSpotifyAmbientTrack(null);
    setSpotifyPlaying(false);
    setPlaybackError(null);
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#1db954]/15 text-[#1db954]">
            <MusicIcon className="size-4" />
          </span>
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text-primary">
              Spotify
            </h2>
            <p className="text-xs text-text-secondary">Focus music while you work</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close Spotify panel">
          <CloseIcon className="size-5" />
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <SpotifyConnectButton variant="banner" onConnectionChange={setConnected} />

        {spotifyAmbientTrack ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft p-3">
            {spotifyAmbientTrack.albumArtUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={spotifyAmbientTrack.albumArtUrl}
                alt=""
                className="size-16 shrink-0 rounded-lg object-cover shadow-md"
              />
            ) : (
              <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-surface text-text-secondary">
                <MusicIcon className="size-6" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{spotifyAmbientTrack.name}</p>
              <p className="truncate text-xs text-text-secondary">{spotifyAmbientTrack.artist}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[#1db954]">
                {spotifyPlaying ? "Now playing" : "Paused"}
              </p>
            </div>
            <Button
              variant="primary"
              accent="focus"
              size="sm"
              aria-label={spotifyPlaying ? "Pause" : "Play"}
              onClick={() => void toggleSpotifyPlayback()}
            >
              {spotifyPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
            <MusicIcon className="mx-auto size-8 text-text-secondary/60" />
            <p className="mt-2 text-sm font-medium text-text-primary">No track selected</p>
            <p className="mt-1 text-xs text-text-secondary">Search below and pick a song to play while you focus.</p>
          </div>
        )}

        {playbackError ? (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{playbackError}</p>
        ) : null}

        <SpotifyTrackSearch
          label="Search"
          selectedUri={spotifyAmbientTrack?.uri ?? null}
          hideConnect
          connected={connected}
          onSelect={(track) => void handleSpotifySelect(track)}
          onClear={() => void handleClearTrack()}
        />

        {!connected ? (
          <p className="text-xs text-text-secondary">Connect Spotify above to enable search and playback.</p>
        ) : (
          <p className="text-xs text-text-secondary">Streaming requires Spotify Premium and a connected account.</p>
        )}

        <div className="rounded-xl border border-border bg-surface-soft/50 px-3 py-3">
          <label htmlFor={`${titleId}-volume`} className="flex items-center justify-between text-sm text-text-secondary">
            <span className="flex items-center gap-1.5 font-medium text-text-primary">
              <MusicIcon className="size-4" /> Playback volume
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
            className="control mt-2 w-full accent-[#1db954]"
          />
        </div>
      </div>
    </Dialog>
  );
}
