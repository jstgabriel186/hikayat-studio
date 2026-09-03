import type {
  AiProvider,
  NaskahContext,
  SceneMediaContext,
  SeoContext,
  RegenerateNarrationContext,
  RegenerateMediaContext,
} from "../provider";
import { loadPromptFile } from "../prompts";
import { extractJsonObject } from "../json";
import {
  parseNaskah,
  parseSceneMedia,
  parseSeoPack,
  parseRegenNarasi,
  parseRegenMedia,
} from "../schemas";
import type {
  NaskahOutput,
  SceneMediaOutput,
  SeoPackOutput,
  NaskahScene,
  SceneMedia,
} from "../types";
import { getPreset } from "../../presets";

/**
 * GoogleGeminiProvider — opsi GRATIS.
 * Memakai REST API resmi (tanpa SDK) ke model gratis
 * (default: gemini-2.5-flash, free tier AI Studio). Kunci gratis dibuat
 * di Google AI Studio (https://aistudio.google.com/apikey) — tanpa kartu kredit.
 */

const API = "https://generativelanguage.googleapis.com/v1beta";

function humanizeError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (/429|resource has been exhausted|rate limit/i.test(msg)) {
    return new Error(
      "Kuota gratis Gemini sedang penuh (rate limit harian). Coba lagi besok atau tambah kunci lain.",
    );
  }
  if (/403|API key not valid|permission/i.test(msg)) {
    return new Error(
      "Kunci Gemini (GEMINI_API_KEY) tidak valid. Buat kunci gratis di Google AI Studio.",
    );
  }
  if (/404|model/i.test(msg)) {
    return new Error(
      "Model Gemini yang diminta tidak ditemukan. Periksa GEMINI_MODEL di .env.local (mis. gemini-2.5-flash).",
    );
  }
  if (/quota|billing/i.test(msg)) {
    return new Error(
      "Kuota Gemini habis atau butuh pengaturan billing. Cek https://aistudio.google.com",
    );
  }
  return new Error(`Gagal memanggil Gemini: ${msg}`);
}

interface Options {
  apiKey: string;
  model: string;
}

export class GoogleGeminiProvider implements AiProvider {
  readonly meta = { id: "gemini" as const, label: "Gemini (gratis)" };
  private apiKey: string;
  private model: string;

  constructor(opts: Options) {
    this.apiKey = opts.apiKey;
    this.model = opts.model || "gemini-2.5-flash";
  }

  describe(): string {
    return `gemini · ${this.model} (gratis)`;
  }

  private async generate(
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<string> {
    const url = `${API}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(240_000),
      });
    } catch (e) {
      throw humanizeError(e);
    }

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw humanizeError(new Error(`${res.status}: ${raw.slice(0, 300)}`));
    }
    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };
    const text = data.candidates
      ?.flatMap((c) => c.content?.parts?.map((p) => p.text ?? "") ?? [])
      .join("\n")
      .trim();
    if (!text) {
      const reason = data.candidates?.[0]?.finishReason ?? "kosong";
      throw new Error(`Respons Gemini kosong (finishReason: ${reason}).`);
    }
    return text;
  }

  private async completeValidated<T>(
    system: string,
    user: string,
    maxTokens: number,
    parse: (raw: unknown) => T,
  ): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await this.generate(system, user, maxTokens);
        const obj = extractJsonObject<unknown>(text);
        return parse(obj);
      } catch (e) {
        lastErr = e;
        if (attempt === 1) {
          user +=
            "\n\nCATATAN: Respons terakhirmu tidak lolos validasi. Ulangi: keluarkan HANYA JSON valid, tanpa teks lain, tanpa blok kode.";
        }
      }
    }
    if (lastErr instanceof Error && lastErr.message.startsWith("Gagal memanggil")) {
      throw lastErr;
    }
    throw new Error(
      "Model gagal menghasilkan output valid setelah dua percobaan. Coba lagi.",
    );
  }

  // ---------- [B] Naskah ----------
  async buildNaskah(ctx: NaskahContext): Promise<NaskahOutput> {
    const system = await loadPromptFile("naskahEngine");
    const preset = getPreset(ctx.stylePresetId);
    const user = `
GAYA PRESET: ${preset.label} — ${preset.arahanNarasi}

METADATA SUMBER:
- Judul sumber: ${ctx.videoTitle ?? "(tanpa judul)"}
- Pengarang/kanal: ${ctx.videoAuthor ?? "-"}
- Bahasa sumber: ${ctx.sourceLang ?? "tidak diketahui"}
- Link sumber: ${ctx.sourceUrl ?? "-"}

DURASI TARGET: ${ctx.targetMinutes} menit
TOTAL KATA YANG DIHARAPKAN: ±${Math.round(ctx.targetMinutes * 140)} kata.

TRANSCRIPT SUMBER (bahan riset — tulis ulang, JANGAN diterjemahkan):
=====
${ctx.transcript?.slice(0, 140000)}
=====

Buat naskah sesuai aturan di atas. Output HANYA JSON.
`.trim();
    return this.completeValidated<NaskahOutput>(system, user, 16000, parseNaskah);
  }

  // ---------- [C] Scene Cards ----------
  async buildSceneMedia(ctx: SceneMediaContext): Promise<SceneMediaOutput> {
    const system = await loadPromptFile("sceneCard");
    const list = ctx.scenes
      .map(
        (s) =>
          `[SCENE ${s.order}] beat=${s.beat}\nNARASI: ${s.narasi.slice(0, 2000)}`,
      )
      .join("\n\n");
    const user = `
ARAHAN VISUAL GAYA: ${ctx.styleArahanVisual}

Berikut ${ctx.scenes.length} scene narasi (berurutan) yang HARUS kamu buatkan
rencana media satu per satu. Jaga era & palet KONSISTEN antar scene.
${ctx.transcript ? `Konteks untuk menentukan era:\n=====\n${ctx.transcript.slice(0, 12000)}\n=====\n` : ""}
SCENE-SCENE:
${list}

Output HANYA JSON: {"scenes":[{order, broll_keywords, sfx, music_mood, ai_image_prompt, archive_suggestion, transition}, ...]}
`.trim();
    return this.completeValidated<SceneMediaOutput>(
      system,
      user,
      8000,
      parseSceneMedia,
    );
  }

  // ---------- [D] SEO ----------
  async buildSeo(ctx: SeoContext): Promise<SeoPackOutput> {
    const system = await loadPromptFile("seoPack");
    const user = `
JUDUL KERJA PROYEK: ${ctx.title}
GAYA NARASI: ${ctx.styleLabel}
DURASI: ${ctx.targetMinutes} menit
SUMBER VIDEO ASLI: ${ctx.sourceUrl ?? "-"}

RINGKASAN NASKAH (untuk chapters — hitung menit kumulatif dari estimasi detik):
${ctx.scenes
  .map((s, i) => {
    const mulaiSec = ctx.scenes.slice(0, i).reduce((a, x) => a + x.durasi, 0);
    return `${fmtCh(mulaiSec)} [${s.beat}] ${s.narasi.slice(0, 160)}`;
  })
  .join("\n")}

TRANSCRIPT SUMBER:
=====
${ctx.transcript?.slice(0, 12000)}
=====

Output HANYA JSON sesuai aturan di atas.
`.trim();
    return this.completeValidated<SeoPackOutput>(
      system,
      user,
      8000,
      parseSeoPack,
    );
  }

  // ---------- Regenerate ----------
  async regenerateNarration(
    ctx: RegenerateNarrationContext,
  ): Promise<NaskahScene> {
    const system = await loadPromptFile("naskahEngine");
    const user = `
Kamu diminta MENULIS ULANG SATU SCENE dari naskah yang sedang dikerjakan.

GAYA PRESET: ${ctx.styleLabel} — ${ctx.styleArahan}
SCENE INI (posisi ${ctx.scene.order}): beat=${ctx.scene.beat}
NARASI LAMA: ${ctx.scene.narasi}

${ctx.prevNarasi ? `SCENE SEBELUMNYA: ${ctx.prevNarasi.slice(0, 1200)}` : "(scene pertama — tetaplah jadi hook 3 detik yang dramatis)"}
${ctx.nextNarasi ? `SCENE SESUDAHNYA: ${ctx.nextNarasi.slice(0, 1200)}` : "(scene terakhir — berikan refleksi penutup singkat)"}

${ctx.transcript ? `Bahan riset bila perlu:\n=====\n${ctx.transcript.slice(0, 16000)}\n=====` : ""}

Tulis ulang scene ini: kalimat baru, tetap sejalan konteks sebelum/sesudah,
sesuai aturan mutlak (bahasa Indonesia orisinal, jangan terjemahkan).
Output HANYA JSON satu objek scene:
{"beat":"...","narasi":"...","estimasi_detik":N,"open_loop":"...|null","catatan_vo":"..."}
`.trim();
    return this.completeValidated(system, user, 4000, parseRegenNarasi);
  }

  async regenerateMedia(
    ctx: RegenerateMediaContext,
  ): Promise<SceneMedia> {
    const system = await loadPromptFile("sceneCard");
    const user = `
ARAHAN VISUAL GAYA: ${ctx.styleArahanVisual}
Buat ulang rencana media SATU scene berikut:
[SCENE ${ctx.scene.order}] beat=${ctx.scene.beat}
NARASI: ${ctx.scene.narasi.slice(0, 2000)}
${ctx.scene.open_loop ? `OPEN LOOP: ${ctx.scene.open_loop}` : ""}

Output HANYA JSON satu objek scene:
{"order":${ctx.scene.order},"broll_keywords":[...],"sfx":[...],"music_mood":"...","ai_image_prompt":"...","archive_suggestion":"...|null","transition":"..."}
`.trim();
    return this.completeValidated(system, user, 3000, parseRegenMedia);
  }

  // ---------- Terjemahan ----------
  async translateLines(
    lines: string[],
    sourceLang?: string | null,
  ): Promise<string[]> {
    const system =
      "Kamu penerjemah subtitle. Terjemahkan setiap baris ke bahasa Inggris alami untuk subtitle video. Jaga makna & suasana; JANGAN menambahkan nomor atau tanda kutip. Keluarkan HANYA JSON array string, satu elemen per baris, urut sama persis dengan input.";
    const user = `BAHASA SUMBER: ${sourceLang ?? "tidak diketahui"}
JUMLAH BARIS: ${lines.length}
BARIS:
${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Output HANYA JSON array: ["terjemahan baris 1","terjemahan baris 2",...]
`.trim();
    const parsed = await this.completeValidated<string[]>(system, user, 8000, (raw) => {
      const arr = Array.isArray(raw) ? raw : (raw as { hasil?: unknown }).hasil;
      if (!Array.isArray(arr)) throw new Error("Bukan array.");
      return arr.map((x) => String(x ?? ""));
    });
    return parsed;
  }
}

function fmtCh(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
