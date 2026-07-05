"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LandChainLogo } from "./LandChainLogo";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/marketplace", key: "marketplace" },
  { href: "/team", key: "team" },
  { href: "/about", key: "about" },
  { href: "/pricing", key: "pricing" },
] as const;

const LOCALES = ["fr", "en"] as const;

export function LocaleSwitcher({ light = false }: { light?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className={`inline-flex overflow-hidden rounded-md border text-xs font-bold uppercase tracking-wide ${
        light ? "border-white/30" : "border-text/20"
      }`}
      role="group"
      aria-label="Switch language"
    >
      {LOCALES.map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => {
              if (!active) router.replace(pathname, { locale: l });
            }}
            className={`px-2.5 py-1 transition-colors cursor-pointer ${
              active
                ? light
                  ? "bg-white text-primary"
                  : "bg-primary text-background"
                : light
                  ? "text-white/70 hover:bg-white/10"
                  : "text-text/60 hover:bg-accent/50"
            }`}
            aria-current={active ? "true" : undefined}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

function Logo({ light }: { light: boolean }) {
  return (
    <LandChainLogo
      href="/"
      size={36}
      showName
      priority
      nameClassName={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-primary"}`}
    />
  );
}

export function Header() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Over the hero the header floats transparent with white text;
  // once scrolled (or on any other page) it becomes a solid glass bar.
  const light = isHome && !scrolled && !open;
  const solid = !isHome || scrolled || open;

  return (
    <header
      className={`${isHome ? "fixed" : "sticky"} top-0 z-50 w-full transition-all duration-300 ${
        solid
          ? "border-b border-text/10 bg-surface/90 shadow-sm backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo light={light} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  light
                    ? active
                      ? "bg-white/15 text-white"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                    : active
                      ? "bg-accent/70 text-primary"
                      : "text-text/80 hover:bg-accent/40 hover:text-primary"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LocaleSwitcher light={light} />
          <Link
            href="/verify"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              light
                ? "border border-white/40 text-white hover:bg-white/10"
                : "border border-primary/25 text-primary hover:bg-primary/5"
            }`}
          >
            {t("verify")}
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-background shadow-lg shadow-secondary/25 transition-transform hover:scale-[1.03]"
            >
              {tc("dashboard")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={`text-sm font-medium ${
                  light ? "text-white/85 hover:text-white" : "text-text/80 hover:text-primary"
                }`}
              >
                {tc("login")}
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-background shadow-lg shadow-secondary/25 transition-transform hover:scale-[1.03]"
              >
                {tc("signup")}
              </Link>
            </>
          )}
        </div>

        <button
          className={`rounded-lg p-2 lg:hidden ${light ? "text-white" : "text-primary"}`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-text/10 bg-surface px-4 pb-6 pt-3 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-text hover:bg-accent/40"
                onClick={() => setOpen(false)}
              >
                {t(item.key)}
              </Link>
            ))}
            <Link
              href="/verify"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-text hover:bg-accent/40"
              onClick={() => setOpen(false)}
            >
              {t("verify")}
            </Link>
            <div className="mt-3 flex items-center gap-3 border-t border-text/10 pt-4">
              <LocaleSwitcher />
              {user ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full bg-secondary px-5 py-2.5 text-center text-sm font-semibold text-background"
                >
                  {tc("dashboard")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full border border-primary/25 px-5 py-2.5 text-center text-sm font-semibold text-primary"
                  >
                    {tc("login")}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full bg-secondary px-5 py-2.5 text-center text-sm font-semibold text-background"
                  >
                    {tc("signup")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
