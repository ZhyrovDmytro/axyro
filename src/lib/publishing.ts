import type { Metadata } from "next";

export const publicOrigin = "https://axyro.app";

export const supportEmail =
  process.env.AXYRO_SUPPORT_EMAIL?.trim() || "support@axyro.app";

export function publicMetadata(
  path: string,
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "Axyro",
      title,
      description,
      url: path,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
