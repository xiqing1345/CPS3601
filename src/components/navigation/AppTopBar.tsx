"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserProfileMenu } from "@/components/profile/UserProfileMenu";
import { LogoutButton } from "@/components/auth/LogoutButton";

type Props = {
  unreadCount: number;
  userId: string;
  email: string;
  displayName: string;
};

function getPageTitle(pathname: string) {
  if (pathname === "/app") return "Dashboard";
  if (pathname.startsWith("/app/help")) return "Help Center";
  if (pathname.startsWith("/app/notifications")) return "Notifications";
  if (pathname.includes("/chat")) return "Room Chat";
  if (pathname.includes("/agreements")) return "Agreements";
  if (pathname.includes("/proposals/new")) return "New Proposal";
  if (pathname.includes("/proposals/") && pathname.endsWith("/edit")) return "Edit Proposal";
  if (pathname.includes("/proposals/")) return "Proposal Details";
  return "Dorm Exchange";
}

export function AppTopBar({ unreadCount, userId, email, displayName }: Props) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-2 py-1 shadow-lg backdrop-blur">
        <p className="hidden max-w-[180px] truncate px-2 text-xs font-semibold text-slate-700 sm:block">
          {title}
        </p>

        <Link className="campus-btn-secondary rounded-full px-3 py-1.5 text-xs" href="/app/help">
          Help
        </Link>

        <Link className="relative campus-btn-secondary rounded-full px-3 py-1.5 text-xs" href="/app/notifications">
          Notifications
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-[10px] font-semibold leading-5 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <UserProfileMenu userId={userId} email={email} displayName={displayName} />
        <LogoutButton />
      </div>
    </div>
  );
}
