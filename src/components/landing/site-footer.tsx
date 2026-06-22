export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold tracking-tight">ViewCreator</p>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered social content for teams that ship fast.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} ViewCreator. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
