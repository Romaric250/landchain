import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const siteMetadata = {
  url: siteUrl,
  name: "LandChain",
  ogImage: "/landchain.png",
  icon: "/landchain.ico",
} as const;

export function buildSiteMetadata({
  locale,
  title,
  description,
}: {
  locale: string;
  title: string;
  description: string;
}): Metadata {
  const ogImage = `${siteMetadata.url}${siteMetadata.ogImage}`;

  return {
    metadataBase: new URL(siteMetadata.url),
    title: { default: title, template: `%s | ${siteMetadata.name}` },
    description,
    icons: {
      icon: [{ url: siteMetadata.icon, sizes: "any" }],
      apple: [{ url: siteMetadata.ogImage, type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_CM" : "en_US",
      siteName: siteMetadata.name,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: siteMetadata.name,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [ogImage],
    },
  };
}
