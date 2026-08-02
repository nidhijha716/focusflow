"use client";

import { useId } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Generic confirm/cancel dialog. Used by `TimerControls`' Reset button --
 * doc 05_Frontend_Specification.pdf section 7: "Reset requires clear
 * behavior and should avoid accidental session completion" -- and left
 * generic (title/description/labels as props) so it can be reused by any
 * other destructive action without a second bespoke dialog component.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "neutral",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} panelClassName="sm:max-w-sm">
      <h2 id={titleId} className="text-lg font-semibold text-text-primary">
        {title}
      </h2>
      <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          size="sm"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
