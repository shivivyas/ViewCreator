import {
  ArrowRight,
  Layers,
  Megaphone,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: WandSparkles,
    title: "Prompt-driven campaigns",
    description:
      "Describe your micro-SaaS once and generate on-brand copy tailored to each channel and audience.",
  },
  {
    icon: Layers,
    title: "Mass content production",
    description:
      "Produce dozens of posts, captions, and hooks in a single session instead of writing one asset at a time.",
  },
  {
    icon: Megaphone,
    title: "Multi-platform marketing",
    description:
      "Adapt messaging for LinkedIn, X, Instagram, TikTok, and more without rebuilding every draft from scratch.",
  },
  {
    icon: Sparkles,
    title: "AI-native workflow",
    description:
      "Built for speed from day one, with smarter generation, variations, and refinement coming next.",
  },
  {
    icon: Zap,
    title: "Ship content faster",
    description:
      "Go from product update to publish-ready marketing assets in minutes, not days.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Define your product",
    description:
      "Add your value proposition, audience, tone, and key features so every output stays on message.",
  },
  {
    step: "02",
    title: "Generate with AI",
    description:
      "Use text prompts to create captions, threads, ad copy, and campaign ideas at scale.",
  },
  {
    step: "03",
    title: "Publish everywhere",
    description:
      "Export platform-ready content and keep your marketing engine running across social channels.",
  },
];

const platforms = [
  "LinkedIn",
  "X",
  "Instagram",
  "TikTok",
  "YouTube",
  "Facebook",
];

const comingSoon = ["Image generation", "Video generation", "Advanced AI APIs"];

export function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <Badge variant="secondary" className="mb-6">
              AI social content studio
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Generate social content at scale for every platform
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
              ViewCreator helps micro-SaaS teams produce high-volume marketing
              content with AI — from captions and campaigns to platform-ready
              posts built for consistent growth.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg">
                Start creating
                <ArrowRight className="size-4" />
              </Button>
              <Link
                href="#workflow"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                See how it works
              </Link>
            </div>
            <div className="mt-12 grid w-full max-w-2xl grid-cols-3 gap-4 border-t pt-8">
              <div>
                <p className="text-2xl font-semibold tracking-tight">10x</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Faster content output
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">Multi</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Platform campaigns
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">AI</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prompt-based creation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">
            Built for marketers
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to market faster
          </h2>
          <p className="mt-4 text-muted-foreground">
            ViewCreator is designed for founders and growth teams who need
            realistic, repeatable content — not one-off posts.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <feature.icon className="size-5 text-foreground" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}

          <Card className="h-full border-dashed sm:col-span-2 lg:col-span-1">
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                Coming soon
              </Badge>
              <CardTitle className="mt-3">Visual content generation</CardTitle>
              <CardDescription>
                Image and video generation APIs are on the roadmap, so your
                prompts can produce complete marketing assets — not just copy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {comingSoon.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="workflow" className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              Simple workflow
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              From prompt to publish in three steps
            </h2>
            <p className="mt-4 text-muted-foreground">
              A streamlined process for teams that need volume without losing
              brand consistency.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {workflowSteps.map((item) => (
              <Card key={item.step} size="sm">
                <CardHeader>
                  <Badge variant="secondary">{item.step}</Badge>
                  <CardTitle className="mt-3">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="platforms" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <Badge variant="outline" className="mb-4">
              Cross-platform reach
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              One product. Every channel that matters.
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Whether you are launching a feature, running ads, or building
              organic reach, ViewCreator helps you tailor content for the
              platforms where your customers already spend time.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Supported platforms</CardTitle>
              <CardDescription>
                Start with core social channels today. More integrations are
                planned as the platform grows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <Badge key={platform} variant="secondary">
                    {platform}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to scale your social marketing?
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              ViewCreator is being built for teams who want AI-powered content
              production without sacrificing quality. Join early and shape what
              comes next.
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            className="shrink-0 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            Get early access
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
}
