"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LandChainLogo } from "@/components/marketing/LandChainLogo";
import { LocaleSwitcher } from "@/components/marketing/Header";
import { Spinner } from "@/components/ui";
import { DropdownItem, DropdownMenu } from "@/components/ui/DropdownMenu";

export interface NavItem {
  href: string;
  label: string;
}

export function AppShell({
  children,
  nav,
  title,
  requireRole,
}: {
  children: React.ReactNode;
  nav: NavItem[];
  title: string;
  requireRole?: string[];
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const tc = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireRole && !requireRole.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, loading, requireRole, router]);

  if (loading || !user || (requireRole && !requireRole.includes(user.role))) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const isAdmin = user.role === "admin" || user.role === "super_admin";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-text/10 bg-primary px-4 py-3 text-background lg:hidden">
        <LandChainLogo href="/dashboard" size={28} showName nameClassName="text-sm font-bold text-background" />
        <span className="text-xs opacity-70">{title}</span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          className="rounded p-1.5"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          menuOpen ? "block" : "hidden"
        } w-full border-b border-text/10 bg-primary text-background lg:flex lg:min-h-screen lg:w-64 lg:flex-col lg:border-b-0`}
      >
        <div className="hidden items-center gap-2 px-6 py-5 lg:flex">
          <LandChainLogo href="/dashboard" size={32} showName nameClassName="text-lg font-bold text-background" />
          <div className="text-xs font-normal opacity-60">{title}</div>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-4 lg:flex-1" aria-label={title}>
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-secondary text-background" : "opacity-80 hover:bg-background/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {isAdmin && !requireRole && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm opacity-80 hover:bg-background/10"
            >
              {tc("admin")}
            </Link>
          )}
          {requireRole && (
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm opacity-80 hover:bg-background/10"
            >
              {tc("dashboard")}
            </Link>
          )}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-background/20 px-4 py-4">
          <DropdownMenu
            align="right"
            className="min-w-0 flex-1"
            trigger={
              <span className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-1 py-1 hover:bg-background/10">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/15 text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs opacity-60">{user.email}</p>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" strokeWidth={2} />
              </span>
            }
          >
            <DropdownItem
              onClick={async () => {
                await logout();
                router.push("/");
              }}
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              {tc("logout")}
            </DropdownItem>
          </DropdownMenu>
          <LocaleSwitcher />
        </div>
      </aside>

      <main className="flex-1 bg-accent/10 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
