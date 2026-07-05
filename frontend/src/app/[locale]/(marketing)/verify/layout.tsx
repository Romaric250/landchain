import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "verify" });
  return buildSiteMetadata({
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function VerifyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return children;
}
