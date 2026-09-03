import { z } from "zod";
import type {
  NaskahOutput,
  SceneMediaOutput,
  SeoPackOutput,
  NaskahScene,
  SceneMedia,
} from "./types";

/**
 * Skema Zod untuk output LLM 5.1–5.3 (lihat /prompts).
 * Digunakan untuk validasi & normalisasi sebelum disimpan ke DB.
 * Kelebihan field dari model otomatis dibuang (default zod = strip).
 */

const teknikHook = z
  .enum([
    "scene-drop",
    "pertanyaan",
    "klaim-berani",
    "countdown",
    "sudut-pandang-tokoh",
    "kontras",
    "angka",
    "misteri",
    "kutipan",
    "mundur-waktu",
  ])
  .catch("scene-drop"); // kalau model memberi label di luar daftar, jangan gagalkan seluruh hasil

const hookVariantSchema = z.object({
  teknik: teknikHook,
  teks: z.string().min(1),
});

const beatSchema = z
  .enum(["hook", "setup", "konflik", "klimaks", "refleksi"])
  .catch("setup");

const naskahSceneSchema = z.object({
  beat: beatSchema,
  narasi: z.string().min(1),
  estimasi_detik: z.coerce.number().int().min(1).max(600).catch(12),
  open_loop: z.string().nullable().optional().catch(null),
  catatan_vo: z.string().default("").catch(""),
});

const naskahOutputSchema = z.object({
  hook_variants: z.array(hookVariantSchema).min(1).catch([]),
  hook_terpilih: z.string().min(1).catch(""),
  alasan_hook: z.string().default("").catch(""),
  scenes: z.array(naskahSceneSchema).min(1),
});

const sceneMediaSchema = z.object({
  order: z.coerce.number().int().min(1),
  broll_keywords: z.array(z.string().min(1)).default([]).catch([]),
  sfx: z.array(z.string().min(1)).default([]).catch([]),
  music_mood: z.string().default("").catch(""),
  ai_image_prompt: z.string().default("").catch(""),
  archive_suggestion: z.string().nullable().optional().catch(null),
  transition: z.string().default("cut").catch("cut"),
});

const sceneMediaOutputSchema = z.object({
  scenes: z.array(sceneMediaSchema).min(1).catch([]),
});

const seoPackOutputSchema = z.object({
  judul_opsi: z
    .array(
      z.object({
        judul: z.string().min(1).max(120),
        label_psikologi: z.string().default("curiosity-gap").catch("curiosity-gap"),
      }),
    )
    .default([])
    .catch([]),
  judul_terpilih: z.string().default("").catch(""),
  deskripsi: z.string().default("").catch(""),
  chapters: z
    .array(
      z.object({
        mulai: z.string().default("00:00").catch("00:00"),
        judul: z.string().default("").catch(""),
      }),
    )
    .default([])
    .catch([]),
  hashtag: z.array(z.string().min(1)).default([]).catch([]),
  tags: z.array(z.string().min(1)).default([]).catch([]),
  pinned_comment: z.string().default("").catch(""),
  thumbnail: z
    .object({
      prompt: z.string().default("").catch(""),
      overlay_text: z.array(z.string().min(1)).default([]).catch([]),
    })
    .default({ prompt: "", overlay_text: [] })
    .catch({ prompt: "", overlay_text: [] }),
});

/** Scene tunggal untuk regenerate narasi (kontrak sama dgn scene naskah). */
const regenNarasiSchema = naskahSceneSchema;

/** Scene tunggal untuk regenerate media (kontrak sama dgn scene-card). */
const regenMediaSchema = sceneMediaSchema;

export function parseNaskah(raw: unknown): NaskahOutput {
  return naskahOutputSchema.parse(raw) as NaskahOutput;
}

export function parseSceneMedia(raw: unknown): SceneMediaOutput {
  return sceneMediaOutputSchema.parse(raw) as SceneMediaOutput;
}

export function parseSeoPack(raw: unknown): SeoPackOutput {
  return seoPackOutputSchema.parse(raw) as SeoPackOutput;
}

export function parseRegenNarasi(raw: unknown): NaskahScene {
  return regenNarasiSchema.parse(raw) as NaskahScene;
}

export function parseRegenMedia(raw: unknown): SceneMedia {
  return regenMediaSchema.parse(raw) as SceneMedia;
}

export type NaskahOutputZ = z.infer<typeof naskahOutputSchema>;
export type SceneMediaOutputZ = z.infer<typeof sceneMediaOutputSchema>;
export type SeoPackOutputZ = z.infer<typeof seoPackOutputSchema>;

/** Wadah hasil + metadata provider untuk log/UI. */
export interface ParsedResult<T> {
  data: T;
  provider: string;
  model?: string;
}
