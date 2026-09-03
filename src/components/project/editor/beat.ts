/** Meta visual beat — dipakai di kartu scene & subtitle. */

export const BEAT_META: Record<string, { label: string; chip: string; dot: string }> = {
  hook: {
    label: "Hook",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  setup: {
    label: "Setup",
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    dot: "bg-sky-400",
  },
  konflik: {
    label: "Konflik",
    chip: "border-red-500/30 bg-red-500/10 text-red-300",
    dot: "bg-red-400",
  },
  klimaks: {
    label: "Klimaks",
    chip: "border-orange-500/35 bg-orange-500/10 text-orange-300",
    dot: "bg-orange-400",
  },
  refleksi: {
    label: "Refleksi",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
};

export function beatMeta(beat: string) {
  return BEAT_META[beat] ?? {
    label: beat,
    chip: "border-border bg-muted text-muted-foreground",
    dot: "bg-border",
  };
}

export const TRANSITION_META: Record<string, string> = {
  cut: "Cut",
  fade: "Fade",
  "match-cut": "Match-cut",
};

export function transitionLabel(t: string): string {
  return TRANSITION_META[t] ?? t;
}
