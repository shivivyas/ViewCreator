"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser, useAuth } from "@clerk/nextjs";
import { Crown, Zap, CreditCard, ChevronDown } from "lucide-react";

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
 * Compact plan status badge with hover details.
 * Shows primary status at a glance and reveals more info on hover.
 */
function PlanStatusBadge({ status }: { status: UserPaymentStatus }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const sub = status.subscription;
  const balance = status.credits?.balance ?? 0;
  const isSubscriber = sub?.status === "active";

  return (
    <div ref={ref} className="relative hidden sm:block">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
          isSubscriber
            ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
            : sub?.status === "past_due"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        )}
      >
        {isSubscriber ? (
          <><Crown className="size-3.5" /> Unlimited</>
        ) : sub?.status === "past_due" ? (
          <><Zap className="size-3.5" /> Past Due</>
        ) : (
          <><Zap className="size-3.5" /> {balance} credits</>
        )}
        <ChevronDown className="size-3 opacity-50" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/50 bg-card p-3 shadow-lg">
          {isSubscriber && sub ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Crown className="size-4 text-primary" />
                <span>Monthly Plan</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {sub.current_period_end
                  ? `Renews ${new Date(sub.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : "Active"}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CreditCard className="size-3" />
                <span>{balance} credits remaining this cycle</span>
              </div>
              {sub.dodo_customer_id && (
                <a
                  href={`/api/dodo/customer-portal?customer_id=${sub.dodo_customer_id}`}
                  className="mt-2 block text-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  Manage Billing
                </a>
              )}
            </>
          ) : sub?.status === "past_due" ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                <Zap className="size-4" />
                <span>Payment Failed</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Update your payment method to resume service.
              </p>
              {sub.dodo_customer_id && (
                <a
                  href={`/api/dodo/customer-portal?customer_id=${sub.dodo_customer_id}`}
                  className="mt-2 block text-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  Update Payment
                </a>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="size-4 text-amber-500" />
                <span>{balance} credits</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {balance > 0
                  ? `Enough for ~${Math.max(1, Math.floor(balance / 2))} premium generations`
                  : "Your credit balance is empty."}
              </p>
              <Link
                href="/pricing"
                className="mt-2 block text-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                {balance > 0 ? "Buy more credits" : "Get credits"}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
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

    // Listen for post-purchase refresh signal
    const onPaymentUpdate = () => fetchBalance();
    window.addEventListener('payment-updated', onPaymentUpdate);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('payment-updated', onPaymentUpdate);
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

              {/* Plan Status — compact dropdown */}
              {paymentStatus && <PlanStatusBadge status={paymentStatus} />}

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
