export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  albumArtUrl: string | null;
}

export interface SpotifyTokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SpotifySearchResponse {
  tracks: {
    items: Array<{
      id: string;
      uri: string;
      name: string;
      preview_url: string | null;
      artists: Array<{ name: string }>;
      album: { images: Array<{ url: string }> };
    }>;
  };
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export interface SpotifyPlayerInstance {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (payload: unknown) => void) => void;
  removeListener: (event: string, callback?: (payload: unknown) => void) => void;
  getCurrentState: () => Promise<unknown>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
}
