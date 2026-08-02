"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { searchSpotifyTracks } from "@/lib/spotify/api";
import { getValidSpotifyAccessToken } from "@/lib/spotify/auth";
import type { SpotifyTrack } from "@/lib/spotify/types";
import { SpotifyConnectButton } from "@/components/spotify/SpotifyConnectButton";

export interface SpotifyTrackSearchProps {
  label: string;
  selectedUri: string | null;
  onSelect: (track: SpotifyTrack) => void;
  onClear?: () => void;
}

export function SpotifyTrackSearch({ label, selectedUri, onSelect, onClear }: SpotifyTrackSearchProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    const token = await getValidSpotifyAccessToken();
    if (!token) {
      setError("Connect Spotify first.");
      return;
    }
    if (!query.trim()) return;

    setLoading(true);
    try {
      const tracks = await searchSpotifyTracks(query);
      setResults(tracks);
      if (tracks.length === 0) setError("No tracks found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary">{label}</span>
        <SpotifyConnectButton />
      </div>

      <div className="flex gap-2">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleSearch();
          }}
          placeholder="Search songs on Spotify"
          className="control flex-1 rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        />
        <Button variant="secondary" size="sm" onClick={() => void handleSearch()} disabled={loading}>
          {loading ? "..." : "Search"}
        </Button>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      {results.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-border">
          {results.map((track) => {
            const selected = track.uri === selectedUri;
            return (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={() => onSelect(track)}
                  className={cn(
                    "control flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0",
                    selected ? "bg-surface-soft text-text-primary" : "text-text-secondary"
                  )}
                >
                  {track.albumArtUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.albumArtUrl} alt="" className="size-10 rounded object-cover" />
                  ) : (
                    <span className="size-10 rounded bg-surface-soft" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{track.name}</span>
                    <span className="block truncate text-xs">{track.artist}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selectedUri && onClear ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear selection
        </Button>
      ) : null}
    </div>
  );
}
