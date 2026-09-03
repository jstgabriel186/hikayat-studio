/** Meta status proyek & peta kemajuan pipeline — aman dipakai client & server. */

export type ProjectStatus =
  | "draft"
  | "transcribed"
  | "scripted"
  | "packaged"
  | "exported";

export const PIPELINE_STEPS: Array<{ id: string; label: string }> = [
  { id: "ingest", label: "Ingest" },
  { id: "naskah", label: "Naskah" },
  { id: "media", label: "Media" },
  { id: "seo", label: "SEO" },
];

/** Jumlah tahap yang sudah tuntas (0–4). */
export function stageProgress(status: string): number {
  switch (status) {
    case "exported":
      return 4;
    case "packaged":
      return 3;
    case "scripted":
      return 2;
    case "transcribed":
      return 1;
    default:
      return 0;
  }
}

interface StatusMeta {
  label: string;
  variant: "default" | "secondary" | "outline" | "success" | "destructive" | "muted";
  blurb: string;
}

export const STATUS_META: Record<string, StatusMeta> = {
  draft: {
    label: "Draf",
    variant: "muted",
    blurb: "Baru dibuat, belum ada materi.",
  },
  transcribed: {
    label: "Transkrip siap",
    variant: "outline",
    blurb: "Materi sumber berhasil diambil / ditempel.",
  },
  scripted: {
    label: "Naskah jadi",
    variant: "default",
    blurb: "Naskah VO Indonesia sudah dibuat.",
  },
  packaged: {
    label: "Paket lengkap",
    variant: "secondary",
    blurb: "Naskah + Scene Cards + SEO selesai.",
  },
  exported: {
    label: "Ter-export",
    variant: "success",
    blurb: "ZIP paket produksi sudah diunduh.",
  },
};

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.draft;
}
