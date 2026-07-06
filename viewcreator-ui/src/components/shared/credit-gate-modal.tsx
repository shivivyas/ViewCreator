"use client";

import { X, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CreditPack {
  id: string;
  credits: number;
  price: string;
}

interface CreditGateModalProps {
  open: boolean;
  loading?: boolean;
  userBalance: number | null;
  requiredCredits: number;
  creditPacks: CreditPack[];
  onBuy: (packId: string) => void;
  onClose: () => void;
}

/**
 * Reusable credit-gate modal shown when a user has insufficient credits.
 * Used by /generate, /templates, and any other credit-gated feature.
 */
export function CreditGateModal({
  open,
  loading = false,
  userBalance,
  requiredCredits,
  creditPacks,
  onBuy,
  onClose,
}: CreditGateModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-xl mx-4">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950">
          <Zap className="size-6 text-amber-500" />
        </div>

        {/* Title */}
        <h3 className="text-center text-lg font-semibold">Buy Credits</h3>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {userBalance !== null && userBalance > 0 ? (
            <>
              You have <strong>{userBalance.toLocaleString()}</strong> credits but
              need <strong>{requiredCredits}</strong> for this generation.
            </>
          ) : (
            <>You don&apos;t have enough credits to generate content.</>
          )}
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Purchase credits to start creating.
        </p>

        {/* Credit pack options */}
        <div className="mt-6 space-y-3">
          {creditPacks.map((pack) => (
            <Button
              key={pack.id}
              size="lg"
              className="w-full rounded-xl text-base"
              disabled={loading}
              onClick={() => onBuy(pack.id)}
            >
              {loading ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Opening checkout...</>
              ) : (
                `Buy ${pack.credits} Credits — ${pack.price}`
              )}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          After purchase, your generation will start automatically.
        </p>
      </div>
    </div>
  );
}
