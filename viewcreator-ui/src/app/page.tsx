import { LandingPage } from "@/components/landing/landing-page";
import { SiteFooter } from "@/components/landing/site-footer";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <main>
        <LandingPage />
      </main>
      <SiteFooter />
    </div>
  );
}
