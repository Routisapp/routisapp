"use client";

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi-config";
import { Toaster } from "sonner";
import { useEffect } from "react";

import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000 },
  },
});

// Suppress noisy browser extension errors (TronLink, etc.)
function useSuppressExtensionErrors() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      const msg   = event.message ?? "";
      const file  = event.filename ?? "";
      if (
        msg.includes("tronlink") ||
        msg.includes("tronLink") ||
        msg.includes("trap returned falsish") ||
        msg.includes("tronlinkParams") ||
        file.includes("extension") ||
        file.includes("injected.js")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    };
    const unhandledHandler = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason ?? "");
      if (
        msg.includes("tronlink") ||
        msg.includes("tronLink") ||
        msg.includes("trap returned falsish") ||
        msg.includes("tronlinkParams")
      ) {
        event.preventDefault();
        return false;
      }
    };
    window.addEventListener("error", handler, true);
    window.addEventListener("unhandledrejection", unhandledHandler, true);

    // Also patch console.error to suppress TronLink noise
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
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor:           "#C9693A",
            accentColorForeground: "#FFFFFF",
            borderRadius:          "medium",
          })}
        >
          <InnerProviders>
            {children}
          </InnerProviders>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#ffffff",
                border:     "1px solid #e8ddd4",
                color:      "#2d1f14",
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
