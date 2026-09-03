import Anthropic from "@anthropic-ai/sdk";
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

/** Pesan error terjemahan Indonesia untuk masalah umum. */
function humanizeError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (/rate limit|429/i.test(msg)) {
    return new Error(
      "Anthropic membatasi permintaan (rate limit). Tunggu sebentar lalu coba lagi.",
    );
  }
  if (/authentication|invalid x-api-key|401/i.test(msg)) {
    return new Error(
      "Kunci ANTHROPIC_API_KEY tidak valid atau kedaluwarsa. Periksa .env.local.",
    );
  }
  if (/model not found|404/i.test(msg)) {
    return new Error(
      "Model Anthropic yang diminta tidak ditemukan. Periksa nama model.",
    );
  }
  return new Error(`Gagal memanggil Anthropic: ${msg}`);
}

interface Options {
  apiKey: string;
  model: string;
}

export class AnthropicProvider implements AiProvider {
  readonly meta = { id: "anthropic" as const, label: "Anthropic" };
  private client: Anthropic;
  private model: string;

  constructor(opts: Options) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model || "claude-sonnet-4-5";
  }

  describe(): string {
    return `anthropic · ${this.model}`;
  }

  private async complete(
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<string> {
    try {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature: 0.7,
        system,
        messages: [{ role: "user", content: user }],
      });
      const text = msg.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!text) throw new Error("Respons Anthropic kosong.");
      return text;
    } catch (e) {
      throw humanizeError(e);
    }
  }

  /** Jalankan prompt lalu validasi JSON. Coba ulang sekali bila bentuk JSON rusak. */
  private async completeValidated<T>(
    system: string,
    user: string,
    maxTokens: number,
    parse: (raw: unknown) => T,
  ): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await this.complete(system, user, maxTokens);
        const obj = extractJsonObject<unknown>(text);
        return parse(obj);
      } catch (e) {
        lastErr = e;
        if (attempt === 1) {
          user +=
            "\n\nCATATAN: Respons terakhirmu tidak lolos validasi. Ulangi. WAJIB keluarkan HANYA JSON valid tanpa teks lain, tanpa blok kode.";
        }
      }
    }
    if (lastErr instanceof Error && lastErr.message.startsWith("Gagal memanggil")) {
      throw lastErr;
    }
    throw new Error(
      "Model gagal menghasilkan output yang valid setelah dua percobaan. Coba lagi atau periksa /prompts.",
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
    return this.completeValidated<NaskahOutput>(
      system,
      user,
      16000,
      (raw) => parseNaskah(raw),
    );
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
Bila butuh konteks untuk menentukan era, berikut transkrip sumbernya:
=====
${(ctx.transcript ?? "").slice(0, 12000)}
=====

SCENE-SCENE:
${list}

Output HANYA JSON: {"scenes":[{order, broll_keywords, sfx, music_mood, ai_image_prompt, archive_suggestion, transition}, ...]}
`.trim();
    return this.completeValidated<SceneMediaOutput>(
      system,
      user,
      8000,
      (raw) => parseSceneMedia(raw),
    );
  }

  // ---------- [D] SEO Pack ----------
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
      (raw) => parseSeoPack(raw),
    );
  }

  // ---------- Regenerate narasi 1 scene ----------
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
    return await this.completeValidated(
      system,
      user,
      4000,
      (raw) => parseRegenNarasi(raw),
    );
  }

  // ---------- Regenerate media 1 scene ----------
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
    return await this.completeValidated(
      system,
      user,
      3000,
      (raw) => parseRegenMedia(raw),
    );
  }

  // ---------- Terjemahan baris (subtitle EN) ----------
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
    const parsed = await this.completeValidated<string[]>(
      system,
      user,
      8000,
      (raw) => {
        const arr = Array.isArray(raw) ? raw : (raw as { hasil?: unknown }).hasil;
        if (!Array.isArray(arr)) throw new Error("Bukan array.");
        return arr.map((x) => String(x ?? ""));
      },
    );
    return parsed;
  }
}

function fmtCh(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
