/**
 * Config runtime — dibaca dari process.env (server-only).
 *
 * ATURAN PROYEK: tidak ada API key di dalam kode. Semua lewat
 * `.env.local` (lihat `.env.example`).
 */

export type AiProviderChoice = "auto" | "anthropic" | "mock";

export interface AppEnv {
  /** provider yang dipaksa user lewat env */
  aiProvider: AiProviderChoice;
  anthropicModel: string;
  openaiModel: string;
  openaiTranscribeModel: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  /** hasil resolusi: provider aktif (dipakai pipeline) */
  resolvedProvider: "anthropic" | "mock";
}

export function getEnv(): AppEnv {
  const aiProvider = (process.env.AI_PROVIDER ?? "auto") as AiProviderChoice;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const openaiApiKey = process.env.OPENAI_API_KEY ?? "";

  let resolvedProvider: "anthropic" | "mock";
  if (aiProvider === "mock") resolvedProvider = "mock";
  else if (aiProvider === "anthropic") resolvedProvider = "anthropic";
  else resolvedProvider = anthropicApiKey ? "anthropic" : "mock";

  return {
    aiProvider,
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
    openaiTranscribeModel:
      process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1",
    anthropicApiKey,
    openaiApiKey,
    resolvedProvider,
  };
}

/** Untuk mode mock tanpa koneksi keluar — nilai default kompatibel provider nyata. */
export const PROVIDER_IDS = ["anthropic", "mock"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
