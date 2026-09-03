import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Slug aman untuk nama folder ZIP: hikayat-{slug} */
export function slugify(input: string, fallback = "proyek"): string {
  const s = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // buang aksen
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || fallback;
}

export function countWords(text: string): number {
  const t = (text ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Durasi detik -> "MM:SS" (atau "H:MM:SS" bila >= 1 jam) */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Tanggal Indonesia pendek, mis. "4 Sep 2026" */
export function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Tanggal + jam Indonesia */
export function fmtDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
