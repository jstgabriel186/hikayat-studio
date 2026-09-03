"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Tombol salin ke clipboard — kebutuhan #1 user: SEMUA field output
 * punya tombol copy (dipakai berulang di seluruh editor).
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value ?? "");
    } catch {
      // fallback utk browser lama / iframe preview
      const ta = document.createElement("textarea");
      ta.value = value ?? "";
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    toast.success(label ? `${label} disalin` : "Disalin ke clipboard");
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={label ? `Salin ${label}` : "Salin"}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 bg-secondary/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold-soft cursor-pointer",
        copied && "border-emerald-500/40 text-emerald-300",
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Tersalin
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> {label ?? "Salin"}
        </>
      )}
    </button>
  );
}

/** Salin semua nilai dari daftar objek {label, value}. */
export function copyMany(items: Array<{ label: string; value: string }>) {
  const text = items.map((i) => `[${i.label}]\n${i.value}`).join("\n\n");
  return navigator.clipboard.writeText(text);
}

/** Pemicu unduh berkas dari Blob/URL di sisi browser. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
