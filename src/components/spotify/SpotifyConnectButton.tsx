"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  clearSpotifyToken,
  getValidSpotifyAccessToken,
  startSpotifyLogin,
} from "@/lib/spotify/auth";
import { isSpotifyPlaybackConfigured } from "@/services/spotifyPlayback.service";

export interface SpotifyConnectButtonProps {
  /** Full-width card layout for the music panel. */
  variant?: "inline" | "banner";
  onConnectionChange?: (connected: boolean) => void;
}

export function SpotifyConnectButton({
  variant = "inline",
  onConnectionChange,
}: SpotifyConnectButtonProps) {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const configured = isSpotifyPlaybackConfigured();

  useEffect(() => {
    let active = true;
    void getValidSpotifyAccessToken().then((token) => {
      if (!active) return;
      const isConnected = Boolean(token);
      setConnected(isConnected);
      setChecking(false);
      onConnectionChange?.(isConnected);
    });
    return () => {
      active = false;
    };
  }, [onConnectionChange]);

  function updateConnected(next: boolean) {
    setConnected(next);
    onConnectionChange?.(next);
  }

  if (!configured) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-surface-soft text-sm text-text-secondary",
          variant === "banner" ? "px-4 py-3" : "px-2 py-1 text-xs"
        )}
      >
        Add{" "}
        <code className="rounded bg-surface px-1 text-text-primary">NEXT_PUBLIC_SPOTIFY_CLIENT_ID</code> to your
        environment to enable Spotify.
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
          connected ? "border-[#1db954]/40 bg-[#1db954]/10" : "border-border bg-surface-soft"
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("size-2 shrink-0 rounded-full", connected ? "bg-[#1db954]" : "bg-text-secondary/50")}
            />
            <p className="text-sm font-semibold text-text-primary">
              {checking ? "Checking Spotify..." : connected ? "Connected to Spotify" : "Not connected"}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            {connected ? "Search and play focus music from your library." : "Connect to search and stream tracks."}
          </p>
        </div>
        {connected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearSpotifyToken();
              updateConnected(false);
            }}
          >
            Disconnect
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => void startSpotifyLogin()} disabled={checking}>
            Connect
          </Button>
        )}
      </div>
    );
  }

  if (connected) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          clearSpotifyToken();
          updateConnected(false);
        }}
      >
        Disconnect
      </Button>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => void startSpotifyLogin()} disabled={checking}>
      Connect Spotify
    </Button>
  );
}
