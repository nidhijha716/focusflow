"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { consumePkceVerifier, exchangeSpotifyCode } from "@/lib/spotify/auth";

function SpotifyCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const [failed, setFailed] = useState(false);

  const verifierMissing = Boolean(code && !error && typeof window !== "undefined" && !sessionStorage.getItem("pomodoro:spotify:pkce_verifier"));

  useEffect(() => {
    if (error || !code) return;

    const verifier = consumePkceVerifier();
    if (!verifier) return;

    void exchangeSpotifyCode(code, verifier)
      .then(() => router.replace("/"))
      .catch(() => setFailed(true));
  }, [code, error, router]);

  if (error) return <p>Spotify login was cancelled.</p>;
  if (!code) return <p>Missing authorization code.</p>;
  if (verifierMissing) return <p>Login session expired. Try connecting again from the app.</p>;
  if (failed) return <p>Could not finish Spotify login.</p>;
  return <p>Connecting Spotify...</p>;
}

export default function SpotifyCallbackPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center text-text-primary">
      <Suspense fallback={<p>Connecting Spotify...</p>}>
        <SpotifyCallbackInner />
      </Suspense>
    </main>
  );
}
