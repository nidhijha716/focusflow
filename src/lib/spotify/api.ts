import type { SpotifySearchResponse, SpotifyTrack } from "@/lib/spotify/types";
import { getValidSpotifyAccessToken } from "@/lib/spotify/auth";

function spotifyErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  if (status === 403) {
    return "Spotify denied access. Connect with Premium, add your account under Users and Access in the Spotify Dashboard, then reconnect.";
  }
  return `Spotify search failed (${status}).`;
}

export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  const accessToken = await getValidSpotifyAccessToken();
  if (!accessToken) {
    throw new Error("Connect Spotify first.");
  }

  const params = new URLSearchParams({
    q: query.trim(),
    type: "track",
    limit: "12",
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(spotifyErrorMessage(response.status, body));
  }

  const payload = (await response.json()) as SpotifySearchResponse;
  return payload.tracks.items.map((item) => ({
    id: item.id,
    uri: item.uri,
    name: item.name,
    artist: item.artists.map((artist) => artist.name).join(", "),
    previewUrl: item.preview_url,
    albumArtUrl: item.album.images[0]?.url ?? null,
  }));
}

export function toSpotifyTrackRef(track: SpotifyTrack) {
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artist: track.artist,
    albumArtUrl: track.albumArtUrl,
  };
}
