"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that labels the dialog; wired to the native `<dialog>` via `aria-labelledby`. */
  labelledBy: string;
  /** `"end"` renders a right-hand drawer on wide viewports (TaskPanel); `"center"` renders a centered modal (Settings, confirmations, popovers). */
  placement?: "center" | "end";
  panelClassName?: string;
  children: ReactNode;
}

/**
 * Module-level pointer to whichever `Dialog` instance is currently the one
 * native `<dialog>` showing `showModal()`, shared across every `Dialog` in
 * the app (Settings, BackgroundPicker, MusicPlayer, TaskPanel, ConfirmDialog,
 * ...). Per the WHATWG spec ("modal dialogs and inert subtrees"), showing a
 * *second* modal `<dialog>` makes every other open `<dialog>` -- not just the
 * rest of the page -- `inert`: its close button, backdrop click, and Escape
 * key all silently stop responding. That's exactly the "Background stacked
 * on Settings, can't close either" bug -- two independent call sites (e.g.
 * the Header's Settings button and page.tsx's Background toggle) each
 * opened their own dialog with no idea the other was already open.
 *
 * Tracking this here -- once, in the shared primitive -- means every caller
 * gets the fix automatically: opening any `Dialog` always closes whichever
 * one was already open first, so at most one native modal (and therefore
 * one always-interactive close button) exists at any time.
 */
let openDialog: { element: HTMLDialogElement; requestClose: () => void } | null = null;

/**
 * Accessible modal primitive built on the native `<dialog>` element.
 *
 * Source: 08_UI_Theme_Colors_and_Responsive_Rules.pdf section 19 --
 * "Dialogs trap focus, close predictably, restore focus to the opener, and
 * support Escape on keyboard platforms." `HTMLDialogElement.showModal()`
 * provides all three natively (top-layer rendering + inert background,
 * Escape fires a cancel->close event pair, focus returns to the previously
 * focused element on close) -- see MDN:
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
 * and https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog.
 *
 * Mobile-vs-desktop placement (drawer/sheet on small screens, centered
 * modal or right-hand panel on larger ones -- doc 08 section 16) is done in
 * pure CSS via the flex alignment on the outer `<dialog>` (`items-end` ->
 * `sm:items-center`), not a JS media-query branch, per doc 08 section 24's
 * "prefer ... deliberate layout changes at defined thresholds" over
 * device-specific JS.
 */
export function Dialog({ open, onClose, labelledBy, placement = "center", panelClassName, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Read inside effects via a ref so the registry always calls the latest
  // `onClose` without forcing the open/close effect to re-run on every
  // render (page.tsx passes a fresh `() => setX(false)` closure each time).
  // Synced in its own effect (not during render) per
  // https://react.dev/reference/react/useRef -- refs must only be written
  // outside of render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    if (open && !dialogElement.open) {
      if (openDialog && openDialog.element !== dialogElement) {
        openDialog.requestClose();
      }
      openDialog = { element: dialogElement, requestClose: () => onCloseRef.current() };
      dialogElement.showModal();
    } else if (!open && dialogElement.open) {
      dialogElement.close();
    }
  }, [open]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    function handleClose() {
      if (openDialog?.element === dialogElement) openDialog = null;
      onCloseRef.current();
    }
    dialogElement.addEventListener("close", handleClose);
    return () => {
      dialogElement.removeEventListener("close", handleClose);
      if (openDialog?.element === dialogElement) openDialog = null;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      className={cn(
        // The dialog element itself doubles as the dimming scrim (bg-overlay)
        // so the semi-opaque surface panel below reliably sits above it --
        // simpler and more predictable across browsers than styling the
        // separate `::backdrop` pseudo-element.
        "m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-overlay p-0",
        // A plain `flex` class here would apply unconditionally, overriding
        // the native `dialog:not([open]) { display: none }` UA rule (an
        // author-origin rule always wins over a UA-origin one regardless of
        // specificity) -- so a *closed* dialog would still lay out at full
        // viewport size in normal flow and silently intercept clicks on
        // whatever content happens to render after it. `open` must be the
        // only thing that toggles between `hidden` and the real layout, and
        // never both at once (`cn` does no dedup, so this must stay a single
        // ternary, not a separately appended `hidden` class).
        open
          ? cn(
              "flex items-end justify-center",
              placement === "end" ? "sm:items-stretch sm:justify-end" : "sm:items-center"
            )
          : "hidden"
      )}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      onCancel={(event) => {
        // Native Escape handling already fires `close`; prevent default here
        // only to guarantee our onClose (not a second native close) drives state.
        event.preventDefault();
        onClose();
      }}
    >
      <div
        className={cn(
          "mobile-sheet w-full overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 shadow-lg",
          placement === "end"
            ? "sm:h-dvh sm:w-full sm:max-w-sm sm:rounded-none sm:rounded-l-3xl"
            : "sm:my-auto sm:max-h-[85dvh] sm:w-full sm:max-w-lg sm:rounded-3xl",
          panelClassName
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </dialog>
  );
}
