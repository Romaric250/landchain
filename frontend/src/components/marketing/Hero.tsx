"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/* Rotating full-bleed hero backgrounds (Unsplash), with a Ken Burns zoom
   and crossfade. Swap these for brand photography later. */
const SLIDES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=80",
];

const SLIDE_MS = 6500;

export function Hero() {
  const t = useTranslations("home.hero");
  const [active, setActive] = useState(0);
  const stats = t.raw("stats") as { value: string; label: string }[];

  useEffect(() => {
    const timer = setInterval(() => setActive((a) => (a + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-primary">
      {/* Background slider */}
      {SLIDES.map((src, i) => (
        <div
          key={src}
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-[1600ms] ease-in-out ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className={`absolute inset-0 bg-cover bg-center ${i === active ? "animate-kenburns" : ""}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        </div>
      ))}
      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-16 pt-32 sm:px-6 sm:pt-36">
        <div className="max-w-3xl">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
            </span>
            {t("badge")}
          </span>

          <h1
            className="animate-fade-up mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "120ms" }}
          >
            {t("titleLine1")}
            <br />
            <span className="bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">
              {t("titleAccent")}
            </span>
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg"
            style={{ animationDelay: "240ms" }}
          >
            {t("subtitle")}
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "360ms" }}
          >
            <Link
              href="/verify"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-secondary/40 transition-transform hover:scale-[1.03]"
            >
              {t("ctaPrimary")}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>

        {/* Slide dots */}
        <div className="mt-12 flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                i === active ? "w-8 bg-secondary" : "w-4 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="relative z-10 border-t border-white/15 bg-black/35 backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-6 sm:px-6 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.value}
              className="animate-fade-up px-4 py-2"
              style={{ animationDelay: `${480 + i * 100}ms` }}
            >
              <div className="text-2xl font-extrabold text-white sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-xs leading-snug text-white/70 sm:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
