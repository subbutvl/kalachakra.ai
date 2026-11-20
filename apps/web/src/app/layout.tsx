import type { Metadata } from "next";
import "@fontsource/aboreto/400.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/noto-sans-tamil/400.css";
import "@fontsource/noto-sans-tamil/600.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "KalaChakra: numerology reports in Tamil and English",
  description:
    "Personal numerology reports in English and Tamil: Vedic, Chaldean, Pythagorean, Lo Shu and Kua.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink antialiased">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
