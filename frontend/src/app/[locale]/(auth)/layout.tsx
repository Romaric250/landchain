"use client";

import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/marketing/Header";
import { ShieldCheck } from "lucide-react";

const AUTH_BACKGROUNDS: Record<string, string> = {
  "/login":
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80",
  "/signup":
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=80",
  "/forgot-password":
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1920&q=80",
  "/reset-password":
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1920&q=80",
  "/verify-email":
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80",
};

const AUTH_TAGLINES: Record<string, { title: string; text: string }> = {
  "/login": {
    title: "Verify before you pay.",
    text: "Every parcel checked. Every record anchored. Land fraud stops here.",
  },
  "/signup": {
    title: "Protect your land investment.",
    text: "Join thousands securing their property records on LandChain.",
  },
  "/forgot-password": {
    title: "We've got you covered.",
    text: "Reset your password securely and get back to verifying parcels.",
  },
  "/reset-password": {
    title: "Choose a new password.",
    text: "Keep your account secure with a strong, unique password.",
  },
  "/verify-email": {
    title: "Almost there.",
    text: "Verify your email to unlock full LandChain features.",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const tc = useTranslations("common");
  const pathname = usePathname();
  const bg = AUTH_BACKGROUNDS[pathname] ?? AUTH_BACKGROUNDS["/login"];
  const tagline = AUTH_TAGLINES[pathname] ?? AUTH_TAGLINES["/login"];

  return (
    <div className="flex min-h-screen bg-primary">
      {/* Left panel — brand story + bg image */}
      <aside className="relative hidden w-[45%] overflow-hidden lg:flex lg:flex-col">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/75 to-primary/60" />
        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="flex items-center gap-3 text-xl font-extrabold text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-white shadow-lg shadow-secondary/30">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
            </span>
            {tc("appName")}
          </Link>
          <div>
            <h2 className="text-3xl font-extrabold leading-tight text-white xl:text-4xl">
              {tagline.title}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
              {tagline.text}
            </p>
            <div className="mt-8 flex gap-6 border-t border-white/15 pt-8">
              {[
                { value: "<10s", label: "Verification" },
                { value: "100%", label: "On-chain" },
                { value: "24/7", label: "Access" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-xl font-extrabold text-accent">{s.value}</div>
                  <div className="text-xs text-white/60">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col bg-[color-mix(in_srgb,var(--lc-primary)_6%,var(--lc-accent))]">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white text-sm">
              <ShieldCheck className="h-4 w-4" />
            </span>
            {tc("appName")}
          </Link>
          <div className="ml-auto">
            <LocaleSwitcher />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className="w-full max-w-md rounded-2xl border border-primary/10 bg-white/90 p-7 shadow-2xl shadow-primary/10 backdrop-blur-sm sm:p-9">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
