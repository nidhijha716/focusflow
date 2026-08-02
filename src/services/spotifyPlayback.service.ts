/**
 * Spotify Web Playback SDK wrapper.
 *
 * Docs: https://developer.spotify.com/documentation/web-playback-sdk
 * Requires Spotify Premium and a user OAuth token with the `streaming` scope.
 */

import { getValidSpotifyAccessToken } from "@/lib/spotify/auth";
import type { SpotifyPlayerInstance } from "@/lib/spotify/types";

let sdkPromise: Promise<void> | null = null;
let player: SpotifyPlayerInstance | null = null;
let deviceId: string | null = null;
let readyPromise: Promise<string> | null = null;

function loadSpotifySdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.Spotify) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-spotify-sdk="true"]');
    if (existing) {
      window.onSpotifyWebPlaybackSDKReady = () => resolve();
      if (window.Spotify) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.dataset.spotifySdk = "true";
    script.onerror = () => reject(new Error("Could not load Spotify SDK."));
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    document.body.appendChild(script);
  });

  return sdkPromise;
}

async function ensurePlayer(volume = 0.5): Promise<SpotifyPlayerInstance> {
  await loadSpotifySdk();
  if (player) return player;

  player = new window.Spotify!.Player({
    name: "Pomodoro FocusFlow",
    volume,
    getOAuthToken: (cb) => {
      void getValidSpotifyAccessToken().then((token) => {
        if (token) cb(token);
      });
    },
  });

  readyPromise = new Promise((resolve, reject) => {
    player!.addListener("ready", (payload: unknown) => {
      const { device_id } = payload as { device_id: string };
      deviceId = device_id;
      resolve(device_id);
    });
    player!.addListener("not_ready", () => {
      deviceId = null;
    });
    player!.addListener("authentication_error", () => reject(new Error("Spotify authentication failed.")));
    player!.addListener("account_error", () => reject(new Error("Spotify Premium is required for playback.")));
  });

  const connected = await player.connect();
  if (!connected) throw new Error("Could not connect Spotify player.");
  await readyPromise;
  return player;
}

export async function playSpotifyTrack(uri: string, volume: number): Promise<void> {
  const accessToken = await getValidSpotifyAccessToken();
  if (!accessToken) throw new Error("Connect Spotify first.");

  const activePlayer = await ensurePlayer(volume);
  await activePlayer.setVolume(volume);

  const activeDeviceId = deviceId;
  if (!activeDeviceId) throw new Error("Spotify player is not ready.");

  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(activeDeviceId)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: [uri] }),
  });

  if (!response.ok && response.status !== 204) {
    throw new Error("Could not start Spotify playback.");
  }
}

export async function pauseSpotifyPlayback(): Promise<void> {
  if (!player) return;
  await player.pause();
}

export async function resumeSpotifyPlayback(): Promise<void> {
  if (!player) return;
  await player.resume();
}

export async function stopSpotifyPlayback(): Promise<void> {
  if (!player) return;
  await player.pause();
}

export async function setSpotifyVolume(volume: number): Promise<void> {
  if (!player) return;
  await player.setVolume(volume);
}

export function isSpotifyPlaybackConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID?.trim());
}
