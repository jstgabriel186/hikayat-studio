/**
 * Config runtime — dibaca dari process.env (server-only).
 *
 * ATURAN PROYEK: tidak ada API key di dalam kode. Semua lewat
 * `.env.local` (lihat `.env.example`).
 */

export type AiProviderChoice = "auto" | "anthropic" | "gemini" | "mock";

export interface AppEnv {
  /** provider yang dipaksa user lewat env */
  aiProvider: AiProviderChoice;
  anthropicModel: string;
  geminiModel: string;
  openaiModel: string;
  openaiTranscribeModel: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  openaiApiKey: string;
  /** hasil resolusi: provider aktif (dipakai pipeline) */
  resolvedProvider: "anthropic" | "gemini" | "mock";
}

export function getEnv(): AppEnv {
  const aiProvider = (process.env.AI_PROVIDER ?? "auto") as AiProviderChoice;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const geminiApiKey = process.env.GEMINI_API_KEY ?? "";
  const openaiApiKey = process.env.OPENAI_API_KEY ?? "";

  let resolvedProvider: "anthropic" | "gemini" | "mock";
  if (aiProvider === "mock") resolvedProvider = "mock";
  else if (aiProvider === "anthropic") resolvedProvider = "anthropic";
  else if (aiProvider === "gemini") resolvedProvider = "gemini";
  else resolvedProvider = anthropicApiKey
    ? "anthropic"
    : geminiApiKey
      ? "gemini"
      : "mock";

  return {
    aiProvider,
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
    openaiTranscribeModel:
      process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1",
    anthropicApiKey,
    geminiApiKey,
    openaiApiKey,
    resolvedProvider,
  };
}
