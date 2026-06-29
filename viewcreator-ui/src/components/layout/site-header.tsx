"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#workflow", label: "How it works" },
  { href: "/#platforms", label: "Platforms" },
];

export function SiteHeader() {
  const { isSignedIn } = useUser();

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
              <Link href="/generate" className="mr-1">
                <Button size="sm" variant="outline">
                  AI Studio
                </Button>
              </Link>
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
