"use client";

import { Check, Clapperboard, Feather, Loader2, Search, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STEPS } from "@/lib/status";

export type StepStatus = "idle" | "running" | "done" | "error";
export type PipelineState = Record<string, StepStatus>;

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ingest: Search,
  naskah: Feather,
  media: Clapperboard,
  seo: TrendingUp,
};

const LABELS = PIPELINE_STEPS;

/**
 * Timeline progress pipeline: Ingest → Naskah → Media → SEO.
 * `state` adalah map id tahap → status.
 */
export function PipelineTimeline({
  state,
  compact = false,
}: {
  state: PipelineState;
  compact?: boolean;
}) {
  const items = LABELS;
  const list = items.map((s, i) => ({
    ...s,
    status: state[s.id] ?? "idle",
    last: i === items.length - 1,
  }));

  return (
    <ol className={cn("flex w-full items-start", compact ? "gap-0" : "gap-1")}>
      {list.map((step) => {
        const Icon = ICONS[step.id];
        const isActive = step.status === "running";
        const isDone = step.status === "done";
        const isError = step.status === "error";
        return (
          <li key={step.id} className={cn("flex items-start", !step.last && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
                  isDone &&
                    "border-gold/60 bg-gold/15 text-gold shadow-[0_0_16px_-6px_rgba(201,162,39,.9)]",
                  isActive &&
                    "border-gold bg-gold/10 text-gold animate-hikayat-pulse",
                  isError && "border-red-500/50 bg-red-500/10 text-red-400",
                  step.status === "idle" &&
                    "border-border bg-card text-muted-foreground/60",
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isError ? (
                  <X className="h-4 w-4" />
                ) : Icon ? (
                  <Icon className="h-4 w-4" />
                ) : null}
              </span>
              {!compact && (
                <span
                  className={cn(
                    "text-[11px] font-medium tracking-wide",
                    isDone || isActive
                      ? "text-gold-soft"
                      : isError
                        ? "text-red-400"
                        : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              )}
            </div>
            {!step.last && (
              <div
                className={cn(
                  "relative top-[17px] mx-1 h-px flex-1",
                  isDone ? "bg-gold/50" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
