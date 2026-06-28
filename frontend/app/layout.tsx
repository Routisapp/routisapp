import type { Metadata } from "next";
import { Providers } from "./providers";
import { ThemeProvider } from "@/lib/theme";
import { SocialDock } from "@/components/layout/SocialDock";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.routis.app"),
  title:       "Routis — DEX Aggregator",
  description: "Best swap rates on Base network",
  icons: {
    icon:    "/logo1.png",
    apple:   "/logo1.png",
    shortcut:"/logo1.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title:       "Routis — DEX Aggregator",
    description: "Best swap rates on Base network",
    url:         "https://www.routis.app",
    siteName:    "Routis",
    images: [
      {
        url:    "/logo1.png",
        width:  512,
        height: 512,
        alt:    "Routis Logo",
      },
    ],
    type: "website",
  },
  other: {
    "base:app_id": "bc_92yf9czs",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
          <SocialDock />
        </ThemeProvider>
      </body>
    </html>
  );
}
