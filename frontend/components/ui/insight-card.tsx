import type { InsightItem, InsightLevel } from "@/lib/types/report";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

export const INSIGHT_STYLES: Record<
  InsightLevel,
  { bar: string; bg: string; icon: React.ElementType; iconColor: string }
> = {
  critical: { bar: "bg-expense", bg: "bg-expense-soft", icon: AlertCircle, iconColor: "text-expense" },
  warning: { bar: "bg-warning", bg: "bg-warning-soft", icon: AlertTriangle, iconColor: "text-warning" },
  good: { bar: "bg-income", bg: "bg-income-soft", icon: CheckCircle2, iconColor: "text-income" },
  info: { bar: "bg-info", bg: "bg-info-soft", icon: Info, iconColor: "text-info" },
};

interface InsightCardProps {
  item: InsightItem;
  showActionBadge?: boolean;
}

export function InsightCard({ item, showActionBadge = true }: InsightCardProps) {
  const style = INSIGHT_STYLES[item.level] ?? INSIGHT_STYLES.info;
  const Icon = style.icon;

  return (
    <div className={`ledger-sheet border-l-4 ${style.bar} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${style.iconColor}`} aria-hidden="true" />
        </div>
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-ink text-[14px] font-semibold leading-tight text-balance">{item.title}</p>
          <p className="text-ink-muted text-xs leading-relaxed">{item.message}</p>
          {showActionBadge && item.action && (
            <div className="pt-1.5">
              <span className="inline-block text-[11px] font-semibold text-brass-dark bg-brass-soft px-2.5 py-1 rounded-lg">
                {item.action}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
