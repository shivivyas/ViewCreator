"use client";

import {
  Check,
  CreditCard,
  Crown,
  HelpCircle,
  Infinity,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

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
import { cn } from "@/lib/utils";

// ── Data ────────────────────────────────────────────────────────────────────

interface PricingTier {
  name: string;
  description: string;
  price: string;
  period?: string;
  credits: string;
  perUnit?: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  cta: string;
  ctaVariant: "default" | "outline" | "secondary";
  icon: typeof Zap;
}

const creditPacks: PricingTier[] = [
  {
    name: "Starter Pack",
    description: "Perfect for trying out AI generation",
    price: "$9",
    credits: "100 credits",
    perUnit: "$0.09/credit",
    features: [
      "Generate up to 100 images or 20 videos",
      "All aspect ratios & sizes",
      "Standard quality output",
      "Reference image upload",
      "7-day credit expiry",
    ],
    cta: "Buy Starter",
    ctaVariant: "outline",
    icon: Zap,
  },
  {
    name: "Creator Pack",
    description: "Best value for regular content creators",
    price: "$39",
    credits: "500 credits",
    perUnit: "$0.078/credit",
    features: [
      "Generate up to 500 images or 100 videos",
      "All aspect ratios & sizes",
      "Premium quality output",
      "Reference image upload (up to 3)",
      "30-day credit expiry",
      "Priority generation queue",
    ],
    highlighted: true,
    badge: "Most Popular",
    cta: "Buy Creator",
    ctaVariant: "default",
    icon: Star,
  },
  {
    name: "Pro Pack",
    description: "For power users and teams",
    price: "$129",
    credits: "2,000 credits",
    perUnit: "$0.064/credit",
    features: [
      "Generate up to 2,000 images or 400 videos",
      "All aspect ratios & sizes",
      "Premium quality output",
      "Reference image upload (up to 5)",
      "90-day credit expiry",
      "Priority generation queue",
      "Early access to new features",
    ],
    cta: "Buy Pro",
    ctaVariant: "secondary",
    icon: Crown,
  },
];

const subscriptionPlans: PricingTier[] = [
  {
    name: "Monthly",
    description: "Go unlimited with a monthly plan",
    price: "$29",
    period: "/month",
    credits: "Unlimited generations",
    features: [
      "Unlimited image & video generation",
      "All aspect ratios & sizes",
      "Premium quality output",
      "Reference image upload (up to 10)",
      "Priority generation queue",
      "All templates unlocked",
      "Early access to new features",
    ],
    highlighted: true,
    badge: "Best Value",
    cta: "Subscribe Monthly",
    ctaVariant: "default",
    icon: Sparkles,
  },
  {
    name: "Annual",
    description: "Two months free with annual billing",
    price: "$290",
    period: "/year",
    credits: "Unlimited generations",
    perUnit: "$24.17/mo",
    features: [
      "Everything in Monthly",
      "Save ~$58 compared to monthly",
      "Priority support",
      "Cancel anytime",
    ],
    cta: "Subscribe Annual",
    ctaVariant: "outline",
    icon: Crown,
  },
];

const faqs = [
  {
    q: "What are credits?",
    a: "Each generation (image or video) costs a set number of credits. Images cost 1 credit each, videos cost 5 credits. Credits are consumed when you hit generate.",
  },
  {
    q: "Do credits expire?",
    a: "Yes — Starter credits expire after 7 days, Creator after 30 days, and Pro after 90 days. Subscription users get unlimited generations with no credit tracking.",
  },
  {
    q: "Can I upgrade from credits to a subscription?",
    a: "Absolutely. Your remaining credits remain available for use alongside an active subscription. You can also downgrade from subscription to credits at any time.",
  },
  {
    q: "What happens if I cancel my subscription?",
    a: "Your subscription remains active until the end of the current billing period. After that, you keep access to any unused credits you purchased separately.",
  },
  {
    q: "Is there a free tier?",
    a: "Not yet. We're focused on delivering exceptional value from day one. Credit packs start at $9 so you can try before committing to a subscription.",
  },
];

// ── Components ──────────────────────────────────────────────────────────────

function PricingCard({ tier, type }: { tier: PricingTier; type: "credits" | "subscription" }) {
  const { isSignedIn } = useUser();
  const href = isSignedIn ? "#checkout" : "/sign-up";

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all duration-300",
        tier.highlighted
          ? "border-primary/40 shadow-lg shadow-primary/5 scale-[1.02]"
          : "border-border/50 hover:border-border/80 hover:shadow-md",
      )}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-sm">
            {tier.badge}
          </Badge>
        </div>
      )}

      <CardHeader className={cn("pb-4", tier.badge && "pt-6")}>
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-xl",
              tier.highlighted
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <tier.icon className="size-5" />
          </div>
          <CardTitle className="text-xl">{tier.name}</CardTitle>
        </div>
        <CardDescription className="text-sm">{tier.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-6 pb-6">
        {/* Price */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
            {tier.period && (
              <span className="text-sm text-muted-foreground">{tier.period}</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm font-medium text-foreground/80">
              {type === "subscription" ? (
                <Infinity className="size-3.5 text-primary" />
              ) : (
                <Zap className="size-3.5 text-amber-500" />
              )}
              <span>{tier.credits}</span>
            </div>
            {tier.perUnit && (
              <span className="text-xs text-muted-foreground">({tier.perUnit})</span>
            )}
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-2.5">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <Check
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  tier.highlighted ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-0">
        <Link href={href} className="w-full">
          <Button
            size="lg"
            variant={tier.ctaVariant}
            className="w-full rounded-xl"
          >
            {tier.cta}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="flex-1">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-xs font-medium">
            <CreditCard className="mr-1.5 size-3.5" />
            Simple, transparent pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Choose your creative power
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Start with flexible credits — no commitment. Upgrade to unlimited when
            you&apos;re ready to scale.
          </p>
        </div>
      </section>

      {/* ── Credits Section ──────────────────────────────────────── */}
      <section className="border-b border-border/50 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pay as you grow
            </h2>
            <p className="mt-2 text-muted-foreground">
              Buy credits once, use them anytime. No recurring charges.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creditPacks.map((tier) => (
              <PricingCard key={tier.name} tier={tier} type="credits" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Subscription Section ─────────────────────────────────── */}
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              For power creators
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Go unlimited
            </h2>
            <p className="mt-2 text-muted-foreground">
              Generate as much as you need. Cancel anytime.
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {subscriptionPlans.map((tier) => (
              <PricingCard key={tier.name} tier={tier} type="subscription" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Generation Cost Table ────────────────────────────────── */}
      <section className="border-b border-border/50 bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How credits work
            </h2>
            <p className="mt-2 text-muted-foreground">
              Each generation type costs a fixed number of credits.
              Subscribers get unlimited access to everything.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-6 py-4 text-left font-medium">Generation Type</th>
                  <th className="px-6 py-4 text-left font-medium">Credit Cost</th>
                  <th className="px-6 py-4 text-left font-medium">Subscription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="px-6 py-4">Image generation (standard)</td>
                  <td className="px-6 py-4">1 credit</td>
                  <td className="px-6 py-4 text-green-600 dark:text-green-400">
                    <span className="inline-flex items-center gap-1">
                      <Check className="size-4" /> Unlimited
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">Image generation (premium)</td>
                  <td className="px-6 py-4">2 credits</td>
                  <td className="px-6 py-4 text-green-600 dark:text-green-400">
                    <span className="inline-flex items-center gap-1">
                      <Check className="size-4" /> Unlimited
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">Video generation</td>
                  <td className="px-6 py-4">5 credits</td>
                  <td className="px-6 py-4 text-green-600 dark:text-green-400">
                    <span className="inline-flex items-center gap-1">
                      <Check className="size-4" /> Unlimited
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4">AI edits / refinements</td>
                  <td className="px-6 py-4">1 credit</td>
                  <td className="px-6 py-4 text-green-600 dark:text-green-400">
                    <span className="inline-flex items-center gap-1">
                      <Check className="size-4" /> Unlimited
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Frequently asked questions
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-border/50 bg-card p-5"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-medium">{faq.q}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────── */}
      <section className="bg-primary/5">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Still have questions?
          </h2>
          <p className="mt-2 text-muted-foreground">
            We&apos;re happy to help you choose the right plan.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Try it free with credits
            </Link>
            <Link
              href="mailto:support@viewcreator.com"
              className={buttonVariants({ size: "lg" })}
            >
              Contact sales
            </Link>
          </div>
        </div>
      </section>

      {/* ── Sticky Mobile Nav Spacer ──────────────────────────────── */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
