import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rabbyWallet,
  metaMaskWallet,
  phantomWallet,
  coinbaseWallet,
  rainbowWallet,
  okxWallet,
  trustWallet,
  injectedWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { Attribution } from "ox/erc8021";

// Builder Code — base.dev > Settings > Builder Code
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["6a3eb0f5fb80a74d69497aad"],
});

const connectors = connectorsForWallets(
  [
    {
      groupName: "Yüklendi",
      wallets: [rabbyWallet, metaMaskWallet, phantomWallet],
    },
    {
      groupName: "Browser Wallets",
      wallets: [injectedWallet, trustWallet, okxWallet],
    },
    {
      groupName: "Diğer",
      wallets: [coinbaseWallet, rainbowWallet, walletConnectWallet],
    },
  ],
  {
    appName:   "Routis",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "a229ba28beb005bc1db48e73d6c3585f",
  },
);

export const wagmiConfig = createConfig({
  chains:     [base],
  connectors,
  transports: {
    [base.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
  ssr: true,
});
