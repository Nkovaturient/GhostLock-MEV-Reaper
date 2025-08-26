"use client";
import { PropsWithChildren, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { CHAIN, WALLETCONNECT_PROJECT_ID, wagmiTransports } from "@/lib/networkConfig";
import { ToastProvider } from "@/components/ToastProvider";

export default function Providers({ children }: PropsWithChildren) {
  const queryClient = useMemo(() => new QueryClient(), []);

  const config = useMemo(
    () =>
      getDefaultConfig({
        appName: "GhostLock: MEV Reaper",
        projectId: WALLETCONNECT_PROJECT_ID || "demo",
        chains: [CHAIN],
        transports: wagmiTransports,
        ssr: true,
      }),
    []
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
  <RainbowKitProvider theme={lightTheme()}>
          <ToastProvider>{children}</ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
