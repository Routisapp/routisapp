"use client";

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, lightTheme, darkTheme, type AvatarComponent } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi-config";
import { useTheme } from "@/lib/theme";
import { Toaster } from "sonner";
import { useEffect } from "react";

import "@rainbow-me/rainbowkit/styles.css";

// Custom avatar: always shows /profile.jpg instead of the random animal icon
const CustomAvatar: AvatarComponent = ({ size }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/profile.jpg"
    alt="profile"
    width={size}
    height={size}
    style={{ borderRadius: "50%", objectFit: "cover", width: size, height: size }}
  />
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

function useSuppressExtensionErrors() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      const msg  = event.message ?? "";
      const file = event.filename ?? "";
      if (
        msg.includes("tronlink") || msg.includes("tronLink") ||
        msg.includes("trap returned falsish") || msg.includes("tronlinkParams") ||
        file.includes("extension") || file.includes("injected.js")
      ) { event.preventDefault(); event.stopImmediatePropagation(); return false; }
    };
    const unhandledHandler = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason ?? "");
      if (msg.includes("tronlink") || msg.includes("tronLink") ||
          msg.includes("trap returned falsish") || msg.includes("tronlinkParams"))
        { event.preventDefault(); return false; }
    };
    window.addEventListener("error", handler, true);
    window.addEventListener("unhandledrejection", unhandledHandler, true);
    const origConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const msg = args.join(" ");
      if (msg.includes("tronlink") || msg.includes("tronlinkParams") || msg.includes("trap returned falsish")) return;
      origConsoleError(...args);
    };
    return () => {
      window.removeEventListener("error", handler, true);
      window.removeEventListener("unhandledrejection", unhandledHandler, true);
      console.error = origConsoleError;
    };
  }, []);
}

function InnerProviders({ children }: { children: React.ReactNode }) {
  useSuppressExtensionErrors();
  const { theme } = useTheme();

  // Build RainbowKit theme safely — guard against undefined from theme fns
  let rkTheme;
  try {
    rkTheme = theme === "dark"
      ? darkTheme({ accentColor: "#C85A2A", accentColorForeground: "#FFFFFF", borderRadius: "medium" })
      : lightTheme({ accentColor: "#C9693A", accentColorForeground: "#FFFFFF", borderRadius: "medium" });
  } catch {
    rkTheme = lightTheme({ accentColor: "#C9693A", accentColorForeground: "#FFFFFF", borderRadius: "medium" });
  }

  const toastStyle = theme === "dark"
    ? { background: "#242424", border: "1px solid #333333", color: "#F5EFE6" }
    : { background: "#ffffff", border: "1px solid #e8ddd4", color: "#2d1f14" };

  return (
    <RainbowKitProvider theme={rkTheme ?? lightTheme()} avatar={CustomAvatar}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{ style: toastStyle }}
      />
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InnerProviders>{children}</InnerProviders>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
