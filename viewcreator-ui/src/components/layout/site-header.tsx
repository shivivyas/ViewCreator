"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser, useAuth } from "@clerk/nextjs";
import { Zap, CreditCard } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getBalance } from "@/services/api/payment-service";
import type { UserPaymentStatus } from "@/types";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#workflow", label: "How it works" },
  { href: "/#platforms", label: "Platforms" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * Credit balance badge.
 * Shows current credit count. Becomes a "Buy Credits" CTA when balance is 0.
 */
function CreditBadge({ status }: { status: UserPaymentStatus }) {
  const balance = status.credits?.balance ?? 0;

  if (balance === 0) {
    return (
      <Link href="/pricing">
        <Button size="sm" variant="default" className="gap-1.5 rounded-lg text-xs h-8">
          <Zap className="size-3.5" />
          Buy Credits
        </Button>
      </Link>
    );
  }

  return (
    <Link
      href="/pricing"
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
        "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
        "dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
      )}
    >
      <Zap className="size-3.5" />
      <span className="tabular-nums">{balance.toLocaleString()}</span>
      <span className="hidden sm:inline">credits</span>
      <CreditCard className="size-3 opacity-50 ml-0.5" />
    </Link>
  );
}

export function SiteHeader() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState<UserPaymentStatus | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setPaymentStatus(null);
      return;
    }

    let cancelled = false;
    const fetchBalance = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.log('[Header] No token, skipping balance fetch');
          return;
        }
        const status = await getBalance(token);
        console.log('[Header] Balance fetched:', status.credits?.balance, 'credits');
        if (!cancelled) setPaymentStatus(status);
      } catch (err) {
        console.error('[Header] Balance fetch failed:', err);
      }
    };

    fetchBalance();
    // Poll every 10s for credit updates
    const interval = setInterval(fetchBalance, 10000);

    // Instant refresh on custom event
    const onPaymentUpdate = () => fetchBalance();
    window.addEventListener('payment-updated', onPaymentUpdate);

    // Refresh when user returns to the tab
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchBalance();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('payment-updated', onPaymentUpdate);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isSignedIn, getToken]);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            V
          </span>
          <span className="text-base font-semibold tracking-tight">
            ViewCreator
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <Button size="sm" variant="ghost">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">
                  Sign up
                </Button>
              </SignUpButton>
            </>
          ) : (
            <>
              <Link href="/templates" className="mr-1">
                <Button size="sm" variant="ghost">
                  Templates
                </Button>
              </Link>
              <Link href="/pricing" className="mr-1">
                <Button size="sm" variant="ghost">
                  Pricing
                </Button>
              </Link>
              <Link href="/generate" className="mr-1">
                <Button size="sm" variant="outline">
                  AI Studio
                </Button>
              </Link>
              <Link href="/payments/history">
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground">
                  History
                </Button>
              </Link>

              {/* Credit Balance Badge */}
              {paymentStatus && <CreditBadge status={paymentStatus} />}

              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8 rounded-lg"
                  }
                }}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
