import JSZip from "jszip";
import { prisma } from "./db";
import { createAiProvider, type AiRequest } from "./ai/provider";
import { slugify } from "./utils";
import { parseStrArr, parseArr, parseSeoPayload } from "./pipeline";
import { buildCues, cuesToSrt, type NarrationInput } from "./srt";
import { getPresetLabel } from "./presets";
import type { Scene, SeoPack, Script, Project } from "@prisma/client";

/**
 * Export ZIP — paket produksi siap-editing (lihat struktur bagian 8 spec).
 * Semua berkas teks dihasilkan di sini (SRT generator ditulis sendiri).
 */

export type ExportOptions = AiRequest & {
  includeEn?: boolean; // sertakan subtitle EN (butuh provider LLM)
};

interface FullProject extends Project {
  script: (Script & { scenes: Scene[] }) | null;
  seoPack: SeoPack | null;
}

function sceneNarrationInputs(scenes: Scene[]): NarrationInput[] {
  return [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      order: s.order,
      narasi: s.narration,
      durasiSec: s.durationSec,
    }));
}

function csvEscape(v: string): string {
  return `"${(v ?? "").replace(/"/g, '""')}"`;
}

// ---------------- Isi berkas ----------------

function buildNaskahMarkdown(p: FullProject): string {
  const script = p.script;
  const lines: string[] = [];
  lines.push(`# NASKAH — ${p.title}`);
  lines.push("");
  lines.push(`Preset gaya: **${getPresetLabel(p.stylePreset)}**`);
  lines.push(
    `Durasi target: **${p.targetMinutes} menit** (±${script?.targetWords ?? 0} kata)`,
  );
  if (p.sourceUrl) lines.push(`Sumber: ${p.sourceUrl}`);
  lines.push("");

  if (script) {
    lines.push("## Hook Terpilih");
    lines.push("");
    lines.push(script.hookVariant);
    if (script.hookReason) {
      lines.push("");
      lines.push(`> Alasan: ${script.hookReason}`);
    }
    const variants = parseArr<{ teknik: string; teks: string }>(
      script.hookVariants,
    );
    if (variants.length) {
      lines.push("");
      lines.push("### 10 Varian Hook (cadangan)");
      variants.forEach((v, i) => {
        lines.push(`${i + 1}. _[${v.teknik}]_ ${v.teks}`);
      });
    }
    lines.push("");
    lines.push("---");
    lines.push("");

    const scenes = [...script.scenes].sort((a, b) => a.order - b.order);
    lines.push("## Adegan");
    scenes.forEach((s) => {
      lines.push("");
      lines.push(`### ${s.order}. [${s.beat}] — ±${s.durationSec} dtk`);
      lines.push("");
      lines.push(s.narration);
      if (s.openLoop) {
        lines.push("");
        lines.push(`*Open loop:* ${s.openLoop}`);
      }
      if (s.voNote) {
        lines.push("");
        lines.push(`*Catatan VO:* ${s.voNote}`);
      }
    });
  }
  lines.push("");
  lines.push("---");
  lines.push(
    "_Dihasilkan oleh Hikayat Studio. Naskah orisinal bahasa Indonesia — bukan terjemahan._",
  );
  return lines.join("\n");
}

function buildCueSheetCsv(scenes: Scene[]): string {
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  const header = [
    "scene",
    "durasi_detik",
    "beat",
    "narasi",
    "broll_keywords",
    "sfx",
    "musik",
    "transisi",
    "arsip",
  ];
  const rows = sorted.map((s) =>
    [
      s.order,
      s.durationSec,
      s.beat,
      s.narration,
      parseStrArr(s.brollKeywords).join("; "),
      parseStrArr(s.sfx).join("; "),
      s.musicMood,
      s.transition,
      s.archiveSuggestion ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function buildPromptsTxt(scenes: Scene[]): string {
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  return sorted
    .map((s) => `#scene ${s.order} — [${s.beat}]\n${s.aiImagePrompt}`)
    .join("\n\n");
}

function buildSeoPackTxt(p: FullProject): string {
  const seo = p.seoPack ? parseSeoPayload(p.seoPack.payload) : null;
  const any = (seo ?? {}) as Record<string, unknown>;
  const opsi = Array.isArray(any.judul_opsi)
    ? (any.judul_opsi as Array<{ judul: string; label_psikologi: string }>)
    : [];
  const tags = Array.isArray(any.tags) ? (any.tags as string[]) : [];
  const hashtag = Array.isArray(any.hashtag) ? (any.hashtag as string[]) : [];
  const chapters = Array.isArray(any.chapters)
    ? (any.chapters as Array<{ mulai: string; judul: string }>)
    : [];
  const th = (any.thumbnail ?? {}) as {
    prompt?: string;
    overlay_text?: string[];
  };

  const L: string[] = [];
  L.push(`# SEO PACK — ${p.title}`);
  L.push("");
  L.push("## Judul Terpilih");
  L.push(String(any.judul_terpilih ?? opsi[0]?.judul ?? ""));
  L.push("");
  L.push("## 10 Opsi Judul (dengan label psikologi)");
  opsi.forEach((o, i) =>
    L.push(`${i + 1}. [${o.label_psikologi}] ${o.judul}`),
  );
  L.push("");
  L.push("## Deskripsi");
  L.push(String(any.deskripsi ?? ""));
  L.push("");
  if (chapters.length) {
    L.push("## Chapters");
    chapters.forEach((c) => L.push(`${c.mulai} — ${c.judul}`));
    L.push("");
  }
  L.push("## Hashtag");
  L.push(hashtag.join(" "));
  L.push("");
  L.push("## Tags");
  L.push(tags.join(", "));
  L.push("");
  L.push("## Komentar Semat (pinned)");
  L.push(String(any.pinned_comment ?? ""));
  L.push("");
  L.push("## Thumbnail");
  L.push(`Prompt AI image:\n${th.prompt ?? ""}`);
  L.push("");
  L.push("Opsi teks overlay (maks 4 kata):");
  (th.overlay_text ?? []).forEach((t) => L.push(`- ${t}`));
  L.push("");
  L.push("---");
  L.push(
    `Sumber riset asli: ${p.sourceUrl ?? "(paste teks)"}. Lakukan verifikasi silang sebelum terbit.`,
  );
  return L.join("\n");
}

function buildScenesJson(p: FullProject): string {
  const scenes = p.script
    ? [...p.script.scenes]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          order: s.order,
          beat: s.beat,
          narration: s.narration,
          durationSec: s.durationSec,
          openLoop: s.openLoop,
          voNote: s.voNote,
          brollKeywords: parseStrArr(s.brollKeywords),
          sfx: parseStrArr(s.sfx),
          musicMood: s.musicMood,
          aiImagePrompt: s.aiImagePrompt,
          archiveSuggestion: s.archiveSuggestion,
          transition: s.transition,
        }))
    : [];
  return JSON.stringify({ project: p.title, scenes }, null, 2);
}

// ---------------- Rakit ZIP ----------------

export async function buildExportZip(
  projectId: string,
  opts: ExportOptions = {},
): Promise<{ buffer: Buffer; folderName: string; files: string[] }> {
  const p = (await prisma.project.findUnique({
    where: { id: projectId },
    include: { script: { include: { scenes: true } }, seoPack: true },
  })) as FullProject | null;
  if (!p) throw new Error("Proyek tidak ditemukan.");

  const script = p.script;
  const scenes = script
    ? [...script.scenes].sort((a, b) => a.order - b.order)
    : [];

  const folder = `hikayat-${slugify(p.title)}`;
  const zip = new JSZip();
  const files: string[] = [];

  // 00-NASKAH.md
  const md = buildNaskahMarkdown(p);
  zip.file(`${folder}/00-NASKAH.md`, md);
  files.push("00-NASKAH.md");

  // 01-subtitle-id.srt (dari scene + estimasi_detik)
  const cueId = buildCues(sceneNarrationInputs(scenes));
  const srtId = cuesToSrt(cueId);
  zip.file(`${folder}/01-subtitle-id.srt`, srtId);
  files.push("01-subtitle-id.srt");

  // 02-subtitle-en.srt (terjemahan LLM per scene)
  if (opts.includeEn !== false && scenes.length) {
    const { provider } = await createAiProvider(opts);
    const translated = await provider.translateLines(
      scenes.map((s) => s.narration),
      p.sourceLang,
    );
    const scenesEn: NarrationInput[] = scenes.map((s, i) => ({
      order: s.order,
      narasi: translated[i] ?? s.narration,
      durasiSec: s.durationSec,
    }));
    zip.file(`${folder}/02-subtitle-en.srt`, cuesToSrt(buildCues(scenesEn)));
    files.push("02-subtitle-en.srt");
  } else {
    files.push("02-subtitle-en.srt (tidak disertakan)");
  }

  // 03-cue-sheet.csv
  zip.file(`${folder}/03-cue-sheet.csv`, buildCueSheetCsv(scenes));
  files.push("03-cue-sheet.csv");

  // 04-prompts-gambar.txt
  zip.file(`${folder}/04-prompts-gambar.txt`, buildPromptsTxt(scenes));
  files.push("04-prompts-gambar.txt");

  // 05-SEO-PACK.txt
  zip.file(`${folder}/05-SEO-PACK.txt`, buildSeoPackTxt(p));
  files.push("05-SEO-PACK.txt");

  // scenes.json
  zip.file(`${folder}/scenes.json`, buildScenesJson(p));
  files.push("scenes.json");

  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { buffer: buf, folderName: folder, files };
}

export type { FullProject };
