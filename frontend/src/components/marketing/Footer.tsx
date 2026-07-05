"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./Header";

export function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const columns = [
    {
      title: t("product"),
      links: [
        { href: "/how-it-works", label: tn("howItWorks") },
        { href: "/marketplace", label: tn("marketplace") },
        { href: "/verify", label: tn("verify") },
        { href: "/map", label: tn("map") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: "/about", label: tn("about") },
        { href: "/team", label: tn("team") },
        { href: "/pricing", label: tn("pricing") },
        { href: "/faq", label: tn("faq") },
        { href: "/contact", label: tn("contact") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: "/terms", label: t("terms") },
        { href: "/privacy", label: t("privacy") },
      ],
    },
  ];

  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V8l7-5 7 5v13" />
                  <path d="M9 21v-6h6v6" />
                </svg>
              </span>
              {tc("appName")}
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{t("tagline")}</p>
            <p className="mt-3 text-sm text-white/60">{t("madeIn")}</p>
            <div className="mt-6 flex items-center gap-3">
              <LocaleSwitcher light />
              {/* Social placeholders */}
              {[
                { label: "X / Twitter", d: "M4 4l16 16M20 4L4 20" },
                { label: "LinkedIn", d: "M6 9v9M6 5v.1M10 18v-5a3 3 0 016 0v5M10 9v1" },
                { label: "Facebook", d: "M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v9h4v-9h3l1-4h-4V8z" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-secondary hover:bg-secondary hover:text-white"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.d} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">{col.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-white/75 transition-colors hover:text-secondary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-white/15 pt-6 text-xs leading-relaxed text-white/50">
          <p>{t("disclaimer")}</p>
          <p className="mt-3">
            © {new Date().getFullYear()} {tc("appName")}. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
