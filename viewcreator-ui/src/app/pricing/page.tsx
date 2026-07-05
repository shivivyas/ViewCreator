"use client";

import { useEffect, useState } from "react";
import { Check, Crown, CreditCard, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useUser, SignUpButton } from "@clerk/nextjs";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlans } from "@/services/api/payment-service";
import type { SubscriptionPlan } from "@/types";

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getPlans()
      .then((data) => {
        if (cancelled) return;
        setPlan(data.subscriptions.find((s) => s.dodo_product_id) ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

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
            One plan. Everything you need.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Unlimited AI-powered content generation. No hidden fees, no credit tracking.
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          {plan ? (
            <div className="mx-auto max-w-md">
              <Card className="relative border-primary/30 shadow-lg shadow-primary/5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-sm">
                    Best Value
                  </Badge>
                </div>

                <CardHeader className="pt-8 pb-4 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Crown className="size-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">
                    Go unlimited with a monthly plan
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-6">
                  <div className="mb-6 text-center">
                    <span className="text-5xl font-bold tracking-tight">{plan.display_price}</span>
                    <span className="ml-1 text-sm text-muted-foreground">/month</span>
                    <div className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Sparkles className="size-3.5 text-primary" />
                      <span>Unlimited generations</span>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
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
                      onClick={() => { window.location.href = "/templates"; }}
                    >
                      Go to templates
                    </Button>
                  ) : (
                    <SignUpButton mode="modal" forceRedirectUrl="/pricing">
                      <Button size="lg" className="w-full rounded-xl text-base">
                        Subscribe
                      </Button>
                    </SignUpButton>
                  )}
                </CardFooter>
              </Card>
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
                q: "What's included in the subscription?",
                a: "Unlimited image and video generation, all aspect ratios and sizes, premium quality output, reference image uploads, priority queue, and all templates unlocked.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Your subscription remains active until the end of the current billing period. No questions asked.",
              },
              {
                q: "Is there a free trial?",
                a: "Not yet, but you can start with a credit pack at just $9 to try the platform before committing to a subscription.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit and debit cards, digital wallets, and local payment methods through our secure checkout.",
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
            Join creators using ViewCreator to generate content at scale.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            {isSignedIn ? (
              <Button
                size="lg"
                className="rounded-xl text-base"
                onClick={() => { window.location.href = "/templates"; }}
              >
                Go to templates
              </Button>
            ) : (
              <SignUpButton mode="modal" forceRedirectUrl="/pricing">
                <Button size="lg" className="rounded-xl text-base">
                  Get started
                </Button>
              </SignUpButton>
            )}
            <Link
              href="/templates"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Browse templates
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
