"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { PipIcon } from "@/components/ui/icons";
import { usePiPSupport } from "@/hooks/usePiPSupport";
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

function PipContent({ label, time }: { label: string; time: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        margin: 0,
        background: "var(--bg)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans, sans-serif)",
      }}
    >
      <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>{label}</p>
      <p style={{ fontSize: "2.5rem", fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{time}</p>
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
  const { snapshot } = useTimer();
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    pipWindowRef.current = pipWindow;
  }, [pipWindow]);

  useEffect(() => {
    return () => {
      pipWindowRef.current?.close();
    };
  }, []);

  async function openPiP() {
    const documentPictureInPicture = getDocumentPictureInPicture();
    if (!documentPictureInPicture) return;

    const pip = await documentPictureInPicture.requestWindow({ width: 260, height: 140 });
    copyStylesInto(pip);
    pip.document.body.style.margin = "0";
    pip.addEventListener("pagehide", () => setPipWindow(null), { once: true });
    setPipWindow(pip);
  }

  function closePiP() {
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
      {pipWindow
        ? createPortal(
            <PipContent label={TIMER_MODE_SESSION_LABELS[snapshot.mode]} time={formatClockTime(snapshot.remainingMs)} />,
            pipWindow.document.body
          )
        : null}
    </>
  );
}
