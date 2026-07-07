"use client";

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getBalance, createCheckoutSession, getPlans } from '@/services/api/payment-service';
import type { PendingGenerate } from '@/hooks/use-post-purchase-resume';
import type { GenerateParams, GenerateVideoParams } from '@/types';

interface UseCreditGateReturn {
  /** Whether the credit gate modal should be shown. */
  showCreditModal: boolean;
  /** Whether a checkout operation is in progress. */
  creditModalLoading: boolean;
  /** The generation that was pending when the gate triggered. */
  pendingGenerate: PendingGenerate | null;
  /** Setter so the page can restore pending state after purchase. */
  setPendingGenerate: (p: PendingGenerate | null) => void;
  /** User's current credit balance. */
  userBalance: number | null;
  /** Setter so the page can update balance after polling. */
  setUserBalance: (b: number | null) => void;
  /** Number of credits required for the attempted operation. */
  requiredCredits: number;
  /** Setter so the page can update required credits during post-purchase polling. */
  setRequiredCredits: (c: number) => void;
  /** Setter so the page can control the modal during post-purchase flow. */
  setShowCreditModal: (v: boolean) => void;
  /** Check if user has enough credits. Returns false and opens modal if not. */
  checkCredits: (cost: number) => Promise<boolean>;
  /** Initiate a credit pack purchase (opens Dodo checkout). */
  buyCredits: (packId: string) => Promise<void>;
  /** Close the credit gate modal and clear pending state. */
  dismissCreditGate: () => void;
}

/**
 * Encapsulates credit gate state and purchase flow for the generate page.
 *
 * Manages: balance check → insufficient → show modal → buy → checkout redirect
 * The post-purchase resume (grant credits + re-generate) lives in the page
 * because it's deeply coupled to the page's generation functions.
 */
export function useCreditGate(
  getToken: () => Promise<string | null>
): UseCreditGateReturn {
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditModalLoading, setCreditModalLoading] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState<PendingGenerate | null>(null);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [requiredCredits, setRequiredCredits] = useState(0);

  const checkCredits = useCallback(async (cost: number): Promise<boolean> => {
    try {
      const token = await getToken();
      if (!token) return false;
      const status = await getBalance(token);
      const balance = status.credits?.balance ?? 0;
      setUserBalance(balance);

      if (balance < cost) {
        setRequiredCredits(cost);
        setShowCreditModal(true);
        return false;
      }

      return true;
    } catch {
      // If balance check fails, allow generation to proceed
      return true;
    }
  }, [getToken]);

  const buyCredits = useCallback(async (packId: string) => {
    setCreditModalLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const plans = await getPlans();
      const creditPlan = plans.creditPacks.find(p => p.dodo_product_id === packId);
      if (!creditPlan) throw new Error('No credit plan available');

      sessionStorage.setItem('pending_plan_id', creditPlan.id);
      const successUrl = `${window.location.origin}/generate?checkout=success`;
      const { checkout_url } = await createCheckoutSession(creditPlan.id, token, successUrl);
      window.location.href = checkout_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
      setCreditModalLoading(false);
    }
  }, [getToken]);

  const dismissCreditGate = useCallback(() => {
    setShowCreditModal(false);
    setPendingGenerate(null);
    sessionStorage.removeItem('pending_generate');
  }, []);

  return {
    showCreditModal,
    setShowCreditModal,
    creditModalLoading,
    pendingGenerate,
    setPendingGenerate,
    userBalance,
    setUserBalance,
    requiredCredits,
    setRequiredCredits,
    checkCredits,
    buyCredits,
    dismissCreditGate,
  };
}
