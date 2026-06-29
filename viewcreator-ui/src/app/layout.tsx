import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { StoreProvider } from "@/store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ViewCreator | AI Social Content Generation Platform",
  description:
    "Generate high-volume social media marketing content with AI. Built for micro-SaaS teams to create platform-ready posts at scale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body
          className="min-h-screen bg-background text-foreground"
          suppressHydrationWarning
        >
          <StoreProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem={true}
              disableTransitionOnChange
            >
              <div className="flex min-h-screen flex-col">
                <SiteHeader />
                <div className="flex-1 flex flex-col">
                  {children}
                </div>
              </div>
              <Toaster position="bottom-right" richColors closeButton />
            </ThemeProvider>
          </StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
