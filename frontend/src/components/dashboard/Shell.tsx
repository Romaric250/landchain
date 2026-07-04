"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import { LocaleSwitcher } from "@/components/marketing/Header";

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
        <Link href="/" className="font-bold">
          LandChain <span className="text-xs opacity-70">{title}</span>
        </Link>
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
        <div className="hidden items-center gap-2 px-6 py-5 text-lg font-bold lg:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-primary text-sm">
            LC
          </span>
          <div>
            LandChain
            <div className="text-xs font-normal opacity-60">{title}</div>
          </div>
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
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs opacity-60">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="rounded-md border border-background/30 px-2 py-1 text-xs hover:bg-background/10 cursor-pointer"
            >
              {tc("logout")}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-accent/10 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
