import { promises as fs } from "fs";
import path from "path";

/**
 * Muat berkas system prompt dari folder /prompts (root proyek).
 * User NON-PROGRAMMER bebas mengedit file .md ini — tidak ada prompt
 * AI yang di-hardcode di dalam kode.
 */
export const PROMPT_DIR = path.join(process.cwd(), "prompts");

export const PROMPT_FILES = {
  naskahEngine: "naskah-engine.md",
  sceneCard: "scene-card.md",
  seoPack: "seo-pack.md",
} as const;

export type PromptKey = keyof typeof PROMPT_FILES;

export async function loadPromptFile(key: PromptKey): Promise<string> {
  try {
    return await fs.readFile(path.join(PROMPT_DIR, PROMPT_FILES[key]), "utf8");
  } catch (e) {
    throw new Error(
      `Gagal membaca berkas prompt /prompts/${PROMPT_FILES[key]}. Pastikan folder prompts ada di root proyek. (${(e as Error).message})`,
    );
  }
}

/** Daftar nama berkas (untuk dokumentasi & cek berkas di seed/startup). */
export function listPromptFiles(): string[] {
  return Object.values(PROMPT_FILES);
}
