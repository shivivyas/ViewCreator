"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser, useAuth } from "@clerk/nextjs";
import { Crown, Zap, Loader2 } from "lucide-react";

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
        if (!token) return;
        const status = await getBalance(token);
        if (!cancelled) setPaymentStatus(status);
      } catch {
        // Silently fail — balance is non-critical
      }
    };

    fetchBalance();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
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

              {/* Credit / Subscription Badge */}
              {paymentStatus && (
                <Link
                  href="/pricing"
                  className={cn(
                    "hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                    paymentStatus.subscription
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  )}
                >
                  {paymentStatus.subscription ? (
                    <>
                      <Crown className="size-3" />
                      Unlimited
                    </>
                  ) : (
                    <>
                      <Zap className="size-3" />
                      {paymentStatus.credits?.balance ?? 0} credits
                    </>
                  )}
                </Link>
              )}

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
