import Link from "next/link";
import { Feather, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gold/15 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-md border border-gold/40 bg-gradient-to-b from-[#241d10] to-[#171006] text-gold shadow-[0_0_18px_-6px_rgba(201,162,39,.8)]">
            <Feather className="h-4.5 w-4.5" strokeWidth={1.6} />
          </span>
          <span className="leading-none">
            <span className="block font-display text-xl tracking-wide text-gold">
              Hikayat
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
              Studio
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/">Proyek</Link>
          </Button>
          <Button asChild size="sm" className="h-8">
            <Link href="/project/new">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Proyek Baru</span>
              <span className="sm:hidden">Baru</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
