"use client";
import Link from "next/link";
import WalletConnectButton from "@/components/WalletConnectButton";
import DarkModeToggle from "@/components/ThemeToggle";

export default function NavBar() {
  return (
    <header className="w-full border-b border-black/10 dark:border-white/15 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-mono font-semibold tracking-tight">
          GhostLock: MEV Reaper
        </Link>
        <nav className="flex items-center gap-4">
          <Link className="hover:underline" href="/submit-intent">
            Submit Intent
          </Link>
          <Link className="hover:underline" href="/dashboard">
            Dashboard
          </Link>
          <Link className="hover:underline" href="/auction-explorer">
            Auction Explorer
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
