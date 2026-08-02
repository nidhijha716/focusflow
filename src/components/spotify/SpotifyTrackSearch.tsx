"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PlayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { searchSpotifyTracks } from "@/lib/spotify/api";
import { getValidSpotifyAccessToken } from "@/lib/spotify/auth";
import type { SpotifyTrack } from "@/lib/spotify/types";
import { SpotifyConnectButton } from "@/components/spotify/SpotifyConnectButton";

export interface SpotifyTrackSearchProps {
  label?: string;
  selectedUri: string | null;
  onSelect: (track: SpotifyTrack) => void;
  onClear?: () => void;
  /** Hide the connect button row when the parent renders its own banner. */
  hideConnect?: boolean;
  /** Pass connection state from a parent banner when `hideConnect` is true. */
  connected?: boolean;
}

export function SpotifyTrackSearch({
  label,
  selectedUri,
  onSelect,
  onClear,
  hideConnect = false,
  connected: connectedProp,
}: SpotifyTrackSearchProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedLocal, setConnectedLocal] = useState(false);
  const connected = connectedProp ?? connectedLocal;

  async function handleSearch() {
    setError(null);
    const token = await getValidSpotifyAccessToken();
    if (!token) {
      setError("Connect Spotify first to search.");
      return;
    }
    if (!query.trim()) return;

    setLoading(true);
    try {
      const tracks = await searchSpotifyTracks(query);
      setResults(tracks);
      if (tracks.length === 0) setError("No tracks found for that search.");
    } catch (searchError) {
      setResults([]);
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {label || !hideConnect ? (
        <div className="flex items-center justify-between gap-2">
          {label ? <span className="text-sm font-semibold text-text-primary">{label}</span> : <span />}
          {!hideConnect ? <SpotifyConnectButton onConnectionChange={setConnectedLocal} /> : null}
        </div>
      ) : null}

      <div className="relative">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleSearch();
          }}
          placeholder={connected ? "Search artists, songs, or albums..." : "Connect Spotify to search..."}
          disabled={!connected}
          className="control w-full rounded-lg border border-border bg-surface py-2.5 pl-3 pr-20 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1db954]/50 disabled:opacity-60"
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          onClick={() => void handleSearch()}
          disabled={loading || !query.trim()}
        >
          {loading ? "..." : "Search"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</p>
      ) : null}

      {results.length > 0 ? (
        <ul className="max-h-56 overflow-y-auto rounded-xl border border-border bg-surface-soft/50">
          {results.map((track) => {
            const selected = track.uri === selectedUri;
            return (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={() => onSelect(track)}
                  className={cn(
                    "control flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0",
                    selected ? "bg-[#1db954]/10 text-text-primary" : "text-text-secondary hover:bg-surface-soft"
                  )}
                >
                  {track.albumArtUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.albumArtUrl} alt="" className="size-11 shrink-0 rounded-md object-cover shadow-sm" />
                  ) : (
                    <span className="size-11 shrink-0 rounded-md bg-surface-soft" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{track.name}</span>
                    <span className="block truncate text-xs opacity-80">{track.artist}</span>
                  </span>
                  {selected ? (
                    <span className="shrink-0 rounded-pill bg-[#1db954]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1db954]">
                      Selected
                    </span>
                  ) : (
                    <PlayIcon className="size-4 shrink-0 opacity-50" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selectedUri && onClear ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={onClear}>
          Clear selection
        </Button>
      ) : null}
    </div>
  );
}
