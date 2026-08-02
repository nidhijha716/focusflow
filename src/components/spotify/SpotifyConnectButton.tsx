"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  clearSpotifyToken,
  getValidSpotifyAccessToken,
  startSpotifyLogin,
} from "@/lib/spotify/auth";
import { isSpotifyPlaybackConfigured } from "@/services/spotifyPlayback.service";

export function SpotifyConnectButton() {
  const [connected, setConnected] = useState(false);
  const configured = isSpotifyPlaybackConfigured();

  useEffect(() => {
    void getValidSpotifyAccessToken().then((token) => setConnected(Boolean(token)));
  }, []);

  if (!configured) {
    return (
      <p className="text-xs text-text-secondary">
        Add <code className="rounded bg-surface-soft px-1">NEXT_PUBLIC_SPOTIFY_CLIENT_ID</code> to enable Spotify.
      </p>
    );
  }

  if (connected) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          clearSpotifyToken();
          setConnected(false);
        }}
      >
        Disconnect Spotify
      </Button>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => void startSpotifyLogin()}>
      Connect Spotify
    </Button>
  );
}
