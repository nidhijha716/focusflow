const SPOTIFY_TOKEN_KEY = "pomodoro:spotify:token";
const SPOTIFY_PKCE_VERIFIER_KEY = "pomodoro:spotify:pkce_verifier";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function storePkceVerifier(verifier: string): void {
  sessionStorage.setItem(SPOTIFY_PKCE_VERIFIER_KEY, verifier);
}

export function consumePkceVerifier(): string | null {
  const value = sessionStorage.getItem(SPOTIFY_PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(SPOTIFY_PKCE_VERIFIER_KEY);
  return value;
}

export function getSpotifyClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID?.trim();
  return id || null;
}

export function getSpotifyRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/spotify/callback`;
}

export function buildSpotifyAuthorizeUrl(clientId: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getSpotifyRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    scope: [
      "streaming",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-email",
    ].join(" "),
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export interface StoredSpotifyToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function readSpotifyToken(): StoredSpotifyToken | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SPOTIFY_TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSpotifyToken;
  } catch {
    return null;
  }
}

export function writeSpotifyToken(token: StoredSpotifyToken): void {
  localStorage.setItem(SPOTIFY_TOKEN_KEY, JSON.stringify(token));
}

export function clearSpotifyToken(): void {
  localStorage.removeItem(SPOTIFY_TOKEN_KEY);
}

export function isSpotifyTokenValid(token: StoredSpotifyToken | null): token is StoredSpotifyToken {
  return Boolean(token && token.accessToken && token.expiresAt > Date.now() + 30_000);
}

export async function exchangeSpotifyCode(code: string, verifier: string): Promise<StoredSpotifyToken> {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error("Spotify client ID is not configured.");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: getSpotifyRedirectUri(),
    code_verifier: verifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Spotify login failed.");
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const token: StoredSpotifyToken = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
  writeSpotifyToken(token);
  return token;
}

export async function refreshSpotifyToken(refreshToken: string): Promise<StoredSpotifyToken> {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error("Spotify client ID is not configured.");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    clearSpotifyToken();
    throw new Error("Spotify session expired. Please connect again.");
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const token: StoredSpotifyToken = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? refreshToken,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
  writeSpotifyToken(token);
  return token;
}

export async function getValidSpotifyAccessToken(): Promise<string | null> {
  const token = readSpotifyToken();
  if (!token) return null;
  if (token.expiresAt > Date.now() + 30_000) return token.accessToken;
  try {
    const refreshed = await refreshSpotifyToken(token.refreshToken);
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export async function startSpotifyLogin(): Promise<void> {
  const clientId = getSpotifyClientId();
  if (!clientId) {
    throw new Error("Add NEXT_PUBLIC_SPOTIFY_CLIENT_ID to your environment.");
  }
  const verifier = generateCodeVerifier();
  storePkceVerifier(verifier);
  const challenge = await generateCodeChallenge(verifier);
  window.location.assign(buildSpotifyAuthorizeUrl(clientId, challenge));
}
