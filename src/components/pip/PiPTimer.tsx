"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { PipIcon } from "@/components/ui/icons";
import { usePiPSupport } from "@/hooks/usePiPSupport";
import { useAppBackground } from "@/hooks/useAppBackground";
import { useTimer } from "@/hooks/useTimer";
import { formatClockTime, TIMER_MODE_SESSION_LABELS } from "@/lib/format";

/** Minimal typing for the Document Picture-in-Picture API -- not yet in TypeScript's DOM lib. Source: https://developer.chrome.com/docs/web-platform/document-picture-in-picture */
interface DocumentPictureInPicture {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  window: Window | null;
}

function getDocumentPictureInPicture(): DocumentPictureInPicture | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture ?? null;
}

/** Copies the current document's stylesheets into the PiP window so Tailwind/theme classes render correctly there too -- the pattern Chrome's own docs recommend for the Document PiP API. */
function copyStylesInto(pipWindow: Window): void {
  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      const cssText = Array.from(styleSheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
      const style = pipWindow.document.createElement("style");
      style.textContent = cssText;
      pipWindow.document.head.appendChild(style);
    } catch {
      if (styleSheet.href) {
        const link = pipWindow.document.createElement("link");
        link.rel = "stylesheet";
        link.href = styleSheet.href;
        pipWindow.document.head.appendChild(link);
      }
    }
  }
}

/** Mirror light/dark theme classes so CSS variables match the main page. */
function syncThemeInto(pipWindow: Window): () => void {
  const pipRoot = pipWindow.document.documentElement;
  const sync = () => {
    pipRoot.className = document.documentElement.className;
    pipRoot.style.colorScheme = document.documentElement.style.colorScheme;
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  return () => observer.disconnect();
}

/**
 * Reads the live snapshot itself (rather than taking `label`/`time` as
 * props) so the once-a-second TICK only re-renders this portalled leaf --
 * never `PiPTimer`'s own button -- and only while a PiP window is actually
 * open (this component is only mounted inside the `createPortal` call
 * below). Architecture doc §10: "Avoid continuous React re-renders outside
 * timer display/progress components."
 */
function PipContent() {
  const { snapshot } = useTimer();
  const { baseBackground, overlayBackground } = useAppBackground();

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        margin: 0,
        overflow: "hidden",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans, sans-serif)",
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: baseBackground, transition: "background 700ms ease-out" }}
      />
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: overlayBackground, transition: "background 700ms ease-out" }}
      />
      <div style={{ position: "relative", textAlign: "center" }}>
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>
          {TIMER_MODE_SESSION_LABELS[snapshot.mode]}
        </p>
        <p style={{ fontSize: "2.5rem", fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {formatClockTime(snapshot.remainingMs)}
        </p>
      </div>
    </div>
  );
}

/**
 * `PiPTimer` -- compact supported-browser timer (doc
 * 05_Frontend_Specification.pdf section 4). Uses the Document
 * Picture-in-Picture API (`window.documentPictureInPicture.requestWindow`,
 * Chromium-only) rather than the older `<video>`-based Picture-in-Picture
 * API, since it opens a real always-on-top DOM window a live React tree
 * can be portaled into (`createPortal`) -- the timer digits keep updating
 * exactly like the main page instead of a static canvas snapshot.
 * Reference: https://developer.chrome.com/docs/web-platform/document-picture-in-picture
 *
 * Feature-detected via `usePiPSupport()`; unsupported browsers get a
 * disabled, clearly-labeled button rather than a silently-missing feature
 * or a runtime error (05 section 4: "PiPTimer: ... hide/disable if
 * unsupported").
 */
export function PiPTimer() {
  const supported = usePiPSupport();
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const themeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pipWindowRef.current = pipWindow;
  }, [pipWindow]);

  useEffect(() => {
    return () => {
      themeCleanupRef.current?.();
      pipWindowRef.current?.close();
    };
  }, []);

  async function openPiP() {
    const documentPictureInPicture = getDocumentPictureInPicture();
    if (!documentPictureInPicture) return;

    const pip = await documentPictureInPicture.requestWindow({ width: 260, height: 140 });
    copyStylesInto(pip);
    themeCleanupRef.current?.();
    themeCleanupRef.current = syncThemeInto(pip);
    pip.document.body.style.margin = "0";
    pip.addEventListener("pagehide", () => {
      themeCleanupRef.current?.();
      themeCleanupRef.current = null;
      setPipWindow(null);
    }, { once: true });
    setPipWindow(pip);
  }

  function closePiP() {
    themeCleanupRef.current?.();
    themeCleanupRef.current = null;
    pipWindow?.close();
    setPipWindow(null);
  }

  if (!supported) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        aria-disabled="true"
        title="Picture-in-picture isn't supported in this browser"
      >
        <PipIcon className="size-4" />
        PiP
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" aria-pressed={pipWindow !== null} onClick={pipWindow ? closePiP : openPiP}>
        <PipIcon className="size-4" />
        {pipWindow ? "Exit PiP" : "PiP"}
      </Button>
      {pipWindow ? createPortal(<PipContent />, pipWindow.document.body) : null}
    </>
  );
}
