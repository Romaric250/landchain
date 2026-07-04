"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/dashboard/Shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("adminPanel.nav");
  const nav = [
    { href: "/admin", label: t("dashboard") },
    { href: "/admin/users", label: t("users") },
    { href: "/admin/kyc", label: t("kyc") },
    { href: "/admin/documents", label: t("documents") },
    { href: "/admin/parcels", label: t("parcels") },
    { href: "/admin/disputes", label: t("disputes") },
    { href: "/admin/payments", label: t("payments") },
    { href: "/admin/theme", label: t("theme") },
    { href: "/admin/logs", label: t("logs") },
  ];
  return (
    <AppShell nav={nav} title="Admin" requireRole={["admin", "super_admin"]}>
      {children}
    </AppShell>
  );
}
