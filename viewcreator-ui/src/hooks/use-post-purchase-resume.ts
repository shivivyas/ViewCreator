"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { getBalance } from '@/services/api/payment-service';
import { calculateGenerationCost, calculateVideoCost } from 'viewcreator-shared';
import type { GenerateParams, GenerateVideoParams } from '@/types';

export type PendingGenerate =
  | { type: 'image'; params: GenerateParams }
  | { type: 'video'; params: GenerateVideoParams };

export interface CreditGateAPI {
  setUserBalance: (b: number | null) => void;
  setShowCreditModal: (v: boolean) => void;
  setPendingGenerate: (p: PendingGenerate | null) => void;
  setRequiredCredits: (c: number) => void;
}

interface UsePostPurchaseResumeOptions {
  getToken: () => Promise<string | null>;
  credit: CreditGateAPI;
  /** Called when we have confirmed credits and should resume a pending generation. */
  onGenerate: (pg: PendingGenerate) => Promise<void>;
}

/**
 * Call the confirm-purchase endpoint to grant credits immediately.
 * Uses a unique idempotency key per purchase flow to prevent double-grant.
 */
async function grantPurchaseCredits(planId: string, token: string, idempotencyKey?: string) {
  const body: Record<string, any> = { plan_id: planId };
  if (idempotencyKey) body.idempotency_key = idempotencyKey;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/payments/confirm-purchase`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  console.log('[Purchase Confirm]', data);
  if (!res.ok) console.error('[Purchase Confirm] Failed:', data);
}

/**
 * Detects post-purchase redirect (?checkout=success) and orchestrates the
 * full resume flow: grant credits → restore pending generation → generate.
 *
 * The page provides an `onGenerate` callback that handles restoring its own
 * form state and calling the actual generation API.
 */
export function usePostPurchaseResume({
  getToken,
  credit,
  onGenerate,
}: UsePostPurchaseResumeOptions): void {
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout !== 'success') return;

    // ── Clean URL ──────────────────────────────────────────
    const url = new URL(window.location.href);
    for (const key of ['checkout', 'plan', 'status', 'subscription_id', 'email']) {
      url.searchParams.delete(key);
    }
    window.history.replaceState({}, '', url.toString());

    toast.success('Purchase successful! Confirming credits...');
    window.dispatchEvent(new CustomEvent('payment-updated'));

    // ── Grant credits ──────────────────────────────────────
    const grant = async () => {
      const token = await getToken();
      if (!token) return;
      const planId = sessionStorage.getItem('pending_plan_id');
      const idempotencyKey = sessionStorage.getItem('pending_idempotency_key') || undefined;
      if (planId) {
        await grantPurchaseCredits(planId, token, idempotencyKey).catch((e) =>
          console.error('[Purchase Flow] grantCredits failed', e)
        );
        sessionStorage.removeItem('pending_plan_id');
        sessionStorage.removeItem('pending_idempotency_key');
      }
    };
    grant();

    // ── Resume pending generation ──────────────────────────
    const stored = sessionStorage.getItem('pending_generate');
    if (!stored) return;

    const savedPending: PendingGenerate | null = JSON.parse(stored);
    if (!savedPending) return;

    const pg = savedPending;
    const resume = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const status = await getBalance(token);
        const balance = status.credits?.balance ?? 0;
        credit.setUserBalance(balance);

        const cost =
          pg.type === 'video'
            ? calculateVideoCost().total
            : calculateGenerationCost((pg.params as GenerateParams).numberOfImages).total;

        if (balance >= cost) {
          toast.success('Credits confirmed. Starting generation...');
          await onGenerate(pg);
          credit.setPendingGenerate(null);
          sessionStorage.removeItem('pending_generate');
          credit.setShowCreditModal(false);
        } else {
          // Poll for credits (webhook race protection)
          toast.info('Waiting for credit confirmation...');
          let retries = 0;
          const poll = async () => {
            if (retries >= 10) {
              credit.setRequiredCredits(cost);
              credit.setShowCreditModal(true);
              return;
            }
            retries++;
            const recheck = await getBalance(token);
            if ((recheck.credits?.balance ?? 0) >= cost) {
              credit.setUserBalance(recheck.credits?.balance ?? 0);
              credit.setShowCreditModal(false);
              credit.setPendingGenerate(null);
              sessionStorage.removeItem('pending_generate');
              toast.success('Credits confirmed! Try generating again.');
            } else {
              setTimeout(poll, 2000);
            }
          };
          poll();
        }
      } catch {
        // Silently fail — the credit gate modal will show on next attempt
      }
    };
    resume();
    // Intentionally runs once per checkout=success URL appearance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
