import type {
  NaskahOutput,
  SceneMediaOutput,
  SeoPackOutput,
  NaskahScene,
  SceneMedia,
} from "./types";
import { loadPromptFile } from "./prompts";
import { getEnv } from "../env";

/**
 * ================================================================
 * LAPISAN ABSTRAKSI PROVIDER AI
 * ----------------------------------------------------------------
 * Seluruh pipeline hanya berbicara dengan antarmuka `AiProvider`.
 * Implementasi nyata sekarang: `anthropic` & `mock`.
 * Provider lain (OpenAI, Google, lokal, dll) cukup mengimplementasi
 * antarmuka ini lalu didaftarkan di `createAiProvider()` — tanpa
 * mengubah satu baris pun di pipeline / UI.
 * ================================================================
 */

export type AiProviderId = "anthropic" | "gemini" | "mock";

export type RequestedProvider =
  | AiProviderId
  | "auto"; // auto = ikuti env

// ---------- Konteks per-tahap ----------

export interface NaskahContext {
  transcript: string;
  stylePresetId: string;
  styleLabel: string;
  styleArahan: string;
  targetMinutes: number;
  videoTitle?: string | null;
  videoAuthor?: string | null;
  sourceUrl?: string | null;
  sourceLang?: string | null;
  model?: string | null;
}

export interface NarrationItem {
  order: number;
  beat: string;
  narasi: string;
  open_loop: string | null;
}

export interface SceneMediaContext {
  scenes: NarrationItem[];
  styleArahanVisual: string;
  transcript?: string | null;
  model?: string | null;
}

export interface SeoContext {
  title: string;
  transcript: string;
  targetMinutes: number;
  styleLabel: string;
  sourceUrl?: string | null;
  /** scene untuk chapters: {detikKumulatif mulai, beat, judul narasi singkat} */
  scenes: Array<{
    order: number;
    beat: string;
    narasi: string;
    durasi: number;
  }>;
  model?: string | null;
}

export interface RegenerateNarrationContext {
  transcript?: string | null;
  styleLabel: string;
  styleArahan: string;
  scene: { order: number; beat: string; narasi: string };
  prevNarasi?: string | null;
  nextNarasi?: string | null;
  model?: string | null;
}

export interface RegenerateMediaContext {
  scene: {
    order: number;
    beat: string;
    narasi: string;
    open_loop: string | null;
  };
  styleArahanVisual: string;
  model?: string | null;
}

export interface ProviderMeta {
  id: AiProviderId;
  label: string;
  model?: string | null;
}

export interface AiProvider {
  readonly meta: ProviderMeta;

  /** [B] Naskah — dari transkrip + preset + durasi → naskah penuh */
  buildNaskah(ctx: NaskahContext): Promise<NaskahOutput>;

  /** [C] Scene Cards — media utk SEMUA scene (agar era & palet konsisten) */
  buildSceneMedia(ctx: SceneMediaContext): Promise<SceneMediaOutput>;

  /** [D] SEO Pack — dari naskah/proyek */
  buildSeo(ctx: SeoContext): Promise<SeoPackOutput>;

  /** Regenerate narasi satu scene (konteks scene sebelum/sesudah) */
  regenerateNarration(ctx: RegenerateNarrationContext): Promise<NaskahScene>;

  /** Regenerate media satu scene */
  regenerateMedia(ctx: RegenerateMediaContext): Promise<SceneMedia>;

  /** Terjemahan sederhana baris-baris (subtitle EN) */
  translateLines(lines: string[], sourceLang?: string | null): Promise<string[]>;

  /** Kicauan status untuk log (contoh: "anthropic · claude-sonnet-4-5") */
  describe(): string;
}

// ---------- Pabrik provider ----------

export interface AiRequest {
  provider?: RequestedProvider | null;
  model?: string | null;
}

/** Pilih implementasi provider berdasar env + override request. */
export async function createAiProvider(
  req: AiRequest = {},
): Promise<{ provider: AiProvider; usedMock: boolean; reason: string }> {
  const env = getEnv();
  const want =
    req.provider && req.provider !== "auto" ? req.provider : env.resolvedProvider;

  if (want === "mock") {
    const { MockProvider } = await import("./providers/mock");
    return {
      provider: new MockProvider(),
      usedMock: true,
      reason: "Mode uji aktif (tanpa biaya / API key).",
    };
  }

  // gemini — GRATIS (free tier Google AI Studio)
  if (want === "gemini") {
    if (!env.geminiApiKey) {
      throw new Error(
        "Mode 'Gemini (gratis)' dipilih tetapi GEMINI_API_KEY belum diisi. Buat kunci gratis di https://aistudio.google.com/apikey lalu isi .env.local.",
      );
    }
    const { GoogleGeminiProvider } = await import("./providers/gemini");
    return {
      provider: new GoogleGeminiProvider({
        apiKey: env.geminiApiKey,
        model: req.model ?? env.geminiModel,
      }),
      usedMock: false,
      reason: "",
    };
  }

  // anthropic (berbayar — hanya bila dipilih eksplisit & ada key)
  if (want === "anthropic") {
    if (!env.anthropicApiKey) {
      throw new Error(
        "Mode 'Anthropic' dipilih tetapi ANTHROPIC_API_KEY belum diisi. Tambahkan di .env.local atau pilih mode uji.",
      );
    }
    const { AnthropicProvider } = await import("./providers/anthropic");
    return {
      provider: new AnthropicProvider({
        apiKey: env.anthropicApiKey,
        model: req.model ?? env.anthropicModel,
      }),
      usedMock: false,
      reason: "",
    };
  }

  // auto: Anthropic (bila ada key) → Gemini gratis → mock
  if (env.anthropicApiKey) {
    const { AnthropicProvider } = await import("./providers/anthropic");
    return {
      provider: new AnthropicProvider({
        apiKey: env.anthropicApiKey,
        model: req.model ?? env.anthropicModel,
      }),
      usedMock: false,
      reason: "",
    };
  }
  if (env.geminiApiKey) {
    const { GoogleGeminiProvider } = await import("./providers/gemini");
    return {
      provider: new GoogleGeminiProvider({
        apiKey: env.geminiApiKey,
        model: req.model ?? env.geminiModel,
      }),
      usedMock: false,
      reason: "",
    };
  }

  const { MockProvider } = await import("./providers/mock");
  return {
    provider: new MockProvider(),
    usedMock: true,
    reason:
      "Belum ada kunci API — fallback otomatis ke mode uji (disarankan: Gemini gratis).",
  };
}

export { loadPromptFile };
