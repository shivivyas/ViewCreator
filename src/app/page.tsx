import { LandingPage } from "@/components/landing/landing-page";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader />
      <main>
        <LandingPage />
      </main>
      <SiteFooter />
    </div>
  );
}
