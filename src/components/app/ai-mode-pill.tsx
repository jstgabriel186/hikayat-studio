"use client";

import * as React from "react";
import { FlaskConical, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Info {
  provider: string;
  label: string;
  describe: string;
  usedMock: boolean;
  reason?: string;
}

/**
 * Pil kecil status mesin AI aktif (diambil dari /api/info).
 * Membantu user tahu apakah hasilnya "nyata" (Gemini/Anthropic)
 * atau hanya contoh Mode Uji — tanpa bocorkan kunci apa pun.
 */
export function AiModePill({ className }: { className?: string }) {
  const [info, setInfo] = React.useState<Info | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/info")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setInfo(d as Info))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  if (error || !info) return null;

  const mock = info.usedMock;
  return (
    <span
      title={info.reason ?? info.describe}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        mock
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-emerald-600/30 bg-emerald-600/10 text-emerald-300",
        className,
      )}
    >
      {mock ? (
        <FlaskConical className="h-3 w-3" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {mock ? "Mode Uji (tanpa AI sungguhan)" : info.label}
    </span>
  );
}
