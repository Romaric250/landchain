"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/marketing/Header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const tc = useTranslations("common");
  return (
    <div className="flex min-h-screen flex-col bg-accent/20">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-background text-sm">
            LC
          </span>
          {tc("appName")}
        </Link>
        <LocaleSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-text/10 bg-background p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
