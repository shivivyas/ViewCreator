import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex flex-1 w-full flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-8xl font-bold tracking-tighter text-primary/80">404</h1>
        <h2 className="text-2xl font-semibold tracking-tight">Page not found</h2>
        <p className="mx-auto max-w-[400px] text-muted-foreground">
          Oops! It seems like this page vanished into the digital void. Let&apos;s get you back to creating amazing content.
        </p>
      </div>
      
      <div className="mt-8 flex gap-4">
        <Link href="/generate">
          <Button variant="default">Go to AI Studio</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
