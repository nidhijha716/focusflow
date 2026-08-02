import type { ReactNode } from "react";

export interface AppShellProps {
  header: ReactNode;
  children: ReactNode;
}

/**
 * Top-level page frame: a full-bleed `<header>` above a `.app-shell`
 * constrained content column (doc 08 section 21 -- fluid max-width
 * container capped around 1440px, doc section 14: "Cap content width
 * instead of stretching controls"). No hooks/state of its own, so it stays
 * a plain Server Component even though its children are Client Components
 * (Next.js allows nesting Client Components as children of a Server
 * Component -- see node_modules/next/dist/docs/01-app/03-api-reference/
 * 01-directives/use-client.md, "Nesting Client Components within Server
 * Components").
 */
export function AppShell({ header, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text-primary">
      <header className="border-b border-border">
        <div className="app-shell flex h-14 items-center justify-between sm:h-16">{header}</div>
      </header>
      <main id="main-content" className="app-shell flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
