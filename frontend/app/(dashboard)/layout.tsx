"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  LayoutDashboard,
  List,
  BarChart2,
  Loader2,
  BookOpen,
  LogOut,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// `id` is explicit (not derived from the Vietnamese label) so element ids
// stay stable even if copy changes or gets localized later.
const NAV_ITEMS = [
  { id: "overview", href: "/", icon: LayoutDashboard, label: "Tổng quan" },
  { id: "transactions", href: "/transactions", icon: List, label: "Giao dịch" },
  { id: "reports", href: "/reports", icon: BarChart2, label: "Báo cáo" },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-paper">
        <Loader2 className="w-7 h-7 text-brass animate-spin" aria-hidden="true" />
        <span className="sr-only">Đang tải…</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-dvh lg:flex bg-paper">
      {/* Desktop sidebar.
          Fix: previously this <aside> had no height of its own, so as a flex
          item it stretched (align-items: stretch, the flex default) to match
          <main>'s height. On a long page that made the sidebar as tall as the
          whole scrollable content — its nav links and logout button would
          scroll out of view along with the page instead of staying put.
          `lg:sticky lg:top-0 lg:h-dvh` gives it a fixed viewport-height box
          that stays pinned while <main> scrolls underneath it, which is the
          standard pattern for an app-shell sidebar. */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0",
          "lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto",
          "border-r border-rule px-5 py-7"
        )}
      >
        <div className="flex items-center gap-2 px-2 mb-10">
          <BookOpen className="w-5 h-5 text-brass" aria-hidden="true" />
          <span className="font-serif-display text-lg text-ink">Sổ Cái AI</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ id, href, icon: Icon, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                id={`nav-${id}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:bg-paper-elevated hover:text-ink"
                )}
              >
                <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/transactions/new"
          className="flex items-center justify-center gap-2 bg-brass hover:bg-brass-dark text-paper text-sm font-semibold py-2.5 rounded-xl transition-colors mb-4"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Thêm giao dịch
        </Link>

        <div className="border-t border-rule pt-4 flex items-center justify-between px-1">
          <div className="min-w-0">
            <p className="text-ink text-sm font-semibold truncate">
              {user?.business_name || user?.full_name || "Bạn"}
            </p>
            <p className="text-ink-faint text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            id="btn-logout"
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="p-2 rounded-lg text-ink-muted hover:text-expense hover:bg-expense-soft transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between px-5 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brass" aria-hidden="true" />
          <span className="font-serif-display text-base text-ink">Sổ Cái AI</span>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-xl bg-paper-elevated border border-rule text-ink-muted hover:text-expense active:scale-95 transition-all"
          title="Đăng xuất"
          aria-label="Đăng xuất"
          id="btn-logout-mobile"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      <main className="flex-1 pb-24 lg:pb-10 min-w-0" id="main-content">
        <div className="max-w-3xl lg:max-w-4xl mx-auto">{children}</div>
      </main>

      {/* Mobile bottom nav — styled like a ticket-tab strip */}
      <nav
        aria-label="Điều hướng chính"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      >
        <div className="bg-paper-elevated border-t border-rule px-2 pt-2 pb-2 flex items-center justify-around shadow-ledger">
          {NAV_ITEMS.map(({ id, href, icon: Icon, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                id={`nav-mobile-${id}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors min-w-16",
                  isActive ? "text-brass" : "text-ink-faint"
                )}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
