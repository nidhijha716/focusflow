import type { SpotifySearchResponse, SpotifyTrack } from "@/lib/spotify/types";
import { getValidSpotifyAccessToken } from "@/lib/spotify/auth";

export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  const accessToken = await getValidSpotifyAccessToken();
  if (!accessToken) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    type: "track",
    limit: "12",
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return [];

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
  };
}
