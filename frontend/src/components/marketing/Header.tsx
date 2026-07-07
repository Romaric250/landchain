"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ChevronDown, Globe, LayoutDashboard, LogOut } from "lucide-react";
import { LandChainLogo } from "./LandChainLogo";
import { useAuth } from "@/lib/auth";
import { persistLocaleChoice } from "@/components/LocalePersistence";
import { DemoModal } from "./DemoModal";
import { DropdownItem, DropdownMenu } from "@/components/ui/DropdownMenu";

const NAV_ITEMS = [
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/map", key: "map" },
  { href: "/marketplace", key: "marketplace" },
  { href: "/team", key: "team" },
  { href: "/about", key: "about" },
  { href: "/pricing", key: "pricing" },
] as const;

const LOCALES = ["en", "fr"] as const;

export function LocaleSwitcher({ light = false }: { light?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const tc = useTranslations("common");

  return (
    <DropdownMenu
      align="right"
      trigger={
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide cursor-pointer ${
            light ? "border-white/30 text-white hover:bg-white/10" : "border-text/20 text-text/70 hover:bg-accent/50"
          }`}
        >
          <Globe className="h-3.5 w-3.5" strokeWidth={2} />
          {locale}
          <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={2.5} />
        </span>
      }
    >
      {LOCALES.map((l) => (
        <DropdownItem
          key={l}
          onClick={() => {
            if (locale !== l) {
              persistLocaleChoice(l);
              router.replace(pathname, { locale: l });
            }
          }}
          className={locale === l ? "font-semibold text-primary" : ""}
        >
          {l === "fr" ? tc("french") : tc("english")}
        </DropdownItem>
      ))}
    </DropdownMenu>
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
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              light
                ? "border border-white/40 text-white hover:bg-white/10"
                : "border border-primary/25 text-primary hover:bg-primary/5"
            }`}
          >
            {t("demo")}
          </button>
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
            <DropdownMenu
              align="right"
              trigger={
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer ${
                    light
                      ? "bg-white/15 text-white hover:bg-white/20"
                      : "bg-secondary text-background shadow-lg shadow-secondary/25"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                  {user.name.split(" ")[0]}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" strokeWidth={2.5} />
                </span>
              }
            >
              <Link
                href="/dashboard"
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-text/80 hover:bg-accent/40 hover:text-primary"
                role="menuitem"
              >
                <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                {tc("dashboard")}
              </Link>
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
            <button
              type="button"
              onClick={() => { setDemoOpen(true); setOpen(false); }}
              className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text hover:bg-accent/40 w-full cursor-pointer"
            >
              {t("demo")}
            </button>
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
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full bg-secondary px-5 py-2.5 text-center text-sm font-semibold text-background"
                  >
                    {tc("dashboard")}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      setOpen(false);
                      router.push("/");
                    }}
                    className="rounded-full border border-primary/25 px-4 py-2.5 text-sm font-semibold text-primary cursor-pointer"
                  >
                    {tc("logout")}
                  </button>
                </>
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
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </header>
  );
}
