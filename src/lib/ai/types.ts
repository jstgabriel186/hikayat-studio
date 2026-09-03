/**
 * Tipe data hasil AI (bentuk JSON yang dikembalikan LLM)
 * dan tipe input pipeline. Disengaja memakai kata kunci JSON dari prompt
 * (Indonesian) agar skema zod bisa menyatu dengan kontrak prompt.
 */

export type Beat = "hook" | "setup" | "konflik" | "klimaks" | "refleksi";

export const BEATS: Beat[] = ["hook", "setup", "konflik", "klimaks", "refleksi"];

export interface HookVariant {
  teknik: string;
  teks: string;
}

/** Scene hasil tahap [B] — belum ada media. */
export interface NaskahScene {
  beat: Beat;
  narasi: string;
  estimasi_detik: number;
  open_loop: string | null;
  catatan_vo: string;
}

export interface NaskahOutput {
  hook_variants: HookVariant[];
  hook_terpilih: string;
  alasan_hook: string;
  scenes: NaskahScene[];
}

/** Satu scene + pelengkap media hasil tahap [C]. */
export interface SceneMedia {
  order: number;
  broll_keywords: string[];
  sfx: string[];
  music_mood: string;
  ai_image_prompt: string;
  archive_suggestion: string | null;
  transition: string; // cut | fade | match-cut
}

export interface SceneMediaOutput {
  scenes: SceneMedia[];
}

export type JudulLabelPsikologi =
  | "curiosity-gap"
  | "angka"
  | "kontras"
  | "pertanyaan"
  | "klaim";

export interface TitleOption {
  judul: string;
  label_psikologi: JudulLabelPsikologi | string;
}

export interface SeoChapter {
  mulai: string; // "00:00"
  judul: string;
}

export interface SeoThumbnail {
  prompt: string;
  overlay_text: string[]; // 5 opsi teks overlay
}

export interface SeoPackOutput {
  judul_opsi: TitleOption[];
  judul_terpilih: string;
  deskripsi: string;
  chapters: SeoChapter[];
  hashtag: string[];
  tags: string[];
  pinned_comment: string;
  thumbnail: SeoThumbnail;
}

/** Metadata materi mentah (output tahap A). */
export interface TranscriptResult {
  transcript: string;
  sourceLang: string | null;
  videoTitle?: string | null;
  videoAuthor?: string | null;
  method: "youtube-subtitle" | "whisper" | "paste-text";
  /** bila method whisper/upload: path audio lokal */
  audioUrl?: string | null;
  note?: string | null;
}
