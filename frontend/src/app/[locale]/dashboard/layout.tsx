"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/dashboard/Shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("dashboard.nav");
  const nav = [
    { href: "/dashboard", label: t("overview") },
    { href: "/dashboard/parcels", label: t("parcels") },
    { href: "/dashboard/parcels/new", label: t("newParcel") },
    { href: "/dashboard/subscription", label: t("subscription") },
    { href: "/dashboard/disputes", label: t("disputes") },
    { href: "/map", label: t("map") },
    { href: "/onboarding/kyc", label: t("kyc") },
  ];
  return (
    <AppShell nav={nav} title="Dashboard">
      {children}
    </AppShell>
  );
}
