"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, Zap, CreditCard, Loader2, LogIn } from "lucide-react";
import { useUser, useAuth, SignUpButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlans, createCheckoutSession } from "@/services/api/payment-service";
import type { SubscriptionPlan } from "@/types";

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getPlans()
      .then((data) => {
        if (cancelled) return;
        // Show all active credit packs with a Dodo product ID
        const creditPlans = data.creditPacks.filter((p) => p.dodo_product_id);
        setPlans(creditPlans);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const handlePurchase = useCallback(async (plan: SubscriptionPlan) => {
    if (!plan || !plan.dodo_product_id) return;

    if (!isSignedIn) {
      return;
    }

    setPurchasingId(plan.id);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const idempotencyKey = `purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('pending_plan_id', plan.id);
      sessionStorage.setItem('pending_idempotency_key', idempotencyKey);
      console.log('[Pricing] Purchase initiated — idempotency key stored', {
        planId: plan.id,
        planName: plan.name,
        idempotencyKey,
        redirectUrl: `${window.location.origin}/generate?checkout=success`,
      });
      const successUrl = `${window.location.origin}/generate?checkout=success`;
      const { checkout_url } = await createCheckoutSession(plan.id, token, successUrl);
      window.location.href = checkout_url;
    } catch (err) {
      console.error('Purchase failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setPurchasingId(null);
    }
  }, [isSignedIn, getToken]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-xs font-medium">
            <CreditCard className="mr-1.5 size-3.5" />
            Simple, transparent pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Pay once. Create forever.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Buy credits when you need them. No subscriptions, no hidden fees.
          </p>
        </div>
      </section>

      {/* Product Cards */}
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          {plans.length > 0 ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-stretch">
              {plans.map((p) => (
                <div key={p.id} className="flex-1">
                  <Card className="relative h-full border-primary/30 shadow-lg shadow-primary/5">
                    <CardHeader className="pt-8 pb-4 text-center">
                      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                        <Zap className="size-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{p.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="pb-6">
                      <div className="mb-6 text-center">
                        <span className="text-5xl font-bold tracking-tight">{p.display_price}</span>
                        {p.display_per_unit && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {p.display_per_unit}
                          </div>
                        )}
                      </div>

                      <ul className="space-y-3">
                        {p.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm">
                            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-0">
                      {isSignedIn ? (
                        <Button
                          size="lg"
                          className="w-full rounded-xl text-base"
                          onClick={() => handlePurchase(p)}
                          disabled={purchasingId === p.id}
                        >
                          {purchasingId === p.id ? (
                            <><Loader2 className="mr-2 size-4 animate-spin" /> Opening checkout...</>
                          ) : (
                            `Buy ${p.name}`
                          )}
                        </Button>
                      ) : (
                        <SignUpButton mode="modal" forceRedirectUrl="/pricing">
                          <Button size="lg" className="w-full rounded-xl text-base">
                            <LogIn className="mr-2 size-4" />
                            Sign up to buy
                          </Button>
                        </SignUpButton>
                      )}
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground">No plans available yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mx-auto max-w-2xl space-y-3">
            {[
              {
                q: "How do credits work?",
                a: "Each credit lets you generate one standard-quality image. Videos cost 5 credits. When you buy 100 credits, they never expire.",
              },
              {
                q: "Can I use credits across multiple projects?",
                a: "Yes! Credits are tied to your account, not to a specific project or template. Use them for images, videos, and edits across all your work.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit and debit cards, digital wallets, and local payment methods through our secure checkout.",
              },
              {
                q: "What if I need more credits?",
                a: "You can buy another 100-credit pack anytime. There's no limit on how many you can purchase. Simply click your credit balance in the header or visit this page.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-border/50 bg-card px-5 py-4"
              >
                <h3 className="text-sm font-medium">{faq.q}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight">
            Ready to create?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Pick a credit pack that fits your needs. No subscription required.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            {isSignedIn ? (
              <Button
                size="lg"
                className="rounded-xl text-base"
                onClick={() => plans[0] && handlePurchase(plans[0])}
                disabled={purchasingId !== null}
              >
                {purchasingId !== null ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Opening checkout...</>
                ) : (
                  'Buy Credits'
                )}
              </Button>
            ) : (
              <SignUpButton mode="modal" forceRedirectUrl="/pricing">
                <Button size="lg" className="rounded-xl text-base">
                  Get started
                </Button>
              </SignUpButton>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
