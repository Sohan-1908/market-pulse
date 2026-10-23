"use client";

import Link from "next/link";
import Image from "next/image";
import { History as HistoryIcon, MessageSquare } from "lucide-react";

interface NavbarProps {
  currentTab: "home" | "history" | "chat";
  onTabChange?: (tab: "home" | "history") => void;
  reportCount?: number;
  supabaseConnected?: boolean;
  onOpenSupabaseModal?: () => void;
}

export default function Navbar({
  currentTab,
  onTabChange,
  reportCount = 0,
}: NavbarProps) {
  const handleNavClick = (tab: "home" | "history", e?: React.MouseEvent) => {
    if (onTabChange) {
      if (e) e.preventDefault();
      onTabChange(tab);
    }
  };

  const isChatActive = currentTab === "home" || (currentTab as string) === "chat";
  const isHistoryActive = currentTab === "history";

  const tabBase =
    "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const tabActive = "bg-accent text-foreground";
  const tabIdle = "text-muted-foreground hover:text-foreground";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      {/* 3-column grid keeps the tabs truly centered, whatever the side widths are */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Brand. Logo file lives at public/logo.svg; change width/height to resize. */}
        <Link
          href="/"
          onClick={(e) => handleNavClick("home", e)}
          className="flex items-center gap-2.5 w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Image
            src="/logo.svg"
            alt=""
            width={32}
            height={32}
            priority
            className="rounded-lg"
          />
          <span className="text-base font-semibold tracking-tight text-foreground">
            Market Pulse
          </span>
        </Link>

        {/* Tabs */}
        <nav
          aria-label="Primary"
          className="flex items-center gap-1 rounded-xl border border-border bg-card/60 p-1"
        >
          <button
            type="button"
            onClick={() => handleNavClick("home")}
            aria-current={isChatActive ? "page" : undefined}
            className={`${tabBase} ${isChatActive ? tabActive : tabIdle}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick("history")}
            aria-current={isHistoryActive ? "page" : undefined}
            className={`${tabBase} ${isHistoryActive ? tabActive : tabIdle}`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>History</span>
            {reportCount > 0 && (
              <span
                className={`min-w-5 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums ${
                  isHistoryActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-border text-muted-foreground"
                }`}
              >
                {reportCount}
              </span>
            )}
          </button>
        </nav>

        {/* Status */}
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs sm:text-sm text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">Agents ready</span>
            <span className="sm:hidden">Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}
