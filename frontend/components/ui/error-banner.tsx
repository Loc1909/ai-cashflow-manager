import { AlertCircle } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="ledger-sheet border-l-4 border-expense bg-expense-soft/40 px-4 py-3 flex items-center gap-2.5 text-sm text-expense"
    >
      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
