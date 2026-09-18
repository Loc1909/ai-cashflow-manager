// components/ui/confirm-dialog.tsx
"use client";

import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xóa",
  cancelLabel = "Hủy",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-[2px] px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="ledger-sheet w-full max-w-sm p-5 stamp-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-expense-soft flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-expense" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-ink font-semibold text-[15px]">
              {title}
            </h2>
            <p className="text-ink-muted text-sm mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-rule text-ink-muted hover:text-ink hover:bg-paper-deep/40 transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-expense text-paper hover:bg-expense/90 transition disabled:opacity-60"
          >
            {isLoading ? "Đang xóa..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}