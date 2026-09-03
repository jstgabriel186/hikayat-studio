/** Tipe data client untuk editor — cerminan bentuk JSON detail proyek. */

export interface SceneC {
  id: string;
  order: number;
  beat: string;
  narration: string;
  durationSec: number;
  openLoop: string | null;
  voNote: string | null;
  brollKeywords: string[];
  sfx: string[];
  musicMood: string;
  aiImagePrompt: string;
  archiveSuggestion: string | null;
  transition: string;
}

export interface HookVariantC {
  teknik: string;
  teks: string;
}

export interface ScriptC {
  id: string;
  hookVariants: HookVariantC[];
  hookVariant: string;
  hookReason: string;
  fullText: string;
  targetWords: number;
  totalDurationSec: number;
  totalWords: number;
  scenes: SceneC[];
}

export interface TitleOptionC {
  judul: string;
  label_psikologi: string;
}

export interface SeoPackC {
  judul_opsi: TitleOptionC[];
  judul_terpilih: string;
  deskripsi: string;
  chapters: Array<{ mulai: string; judul: string }>;
  hashtag: string[];
  tags: string[];
  pinned_comment: string;
  thumbnail: { prompt: string; overlay_text: string[] };
}

export interface ProjectDetailC {
  id: string;
  title: string;
  sourceUrl: string | null;
  sourceType: string;
  sourceLang: string | null;
  transcript: string | null;
  status: string;
  stylePreset: string;
  targetMinutes: number;
  videoTitle: string | null;
  videoAuthor: string | null;
  createdAt: string;
  updatedAt: string;
  script: ScriptC | null;
  seoPack: SeoPackC | null;
}
