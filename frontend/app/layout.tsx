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
  other: {
    "base:app_id": "6a3eb0f5fb80a74d69497aad",
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
