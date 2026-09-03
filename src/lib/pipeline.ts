import { prisma } from "./db";
import { createAiProvider, type AiRequest } from "./ai/provider";
import type {
  NarrationItem,
  SceneMediaContext,
  SeoContext,
} from "./ai/provider";
import { getPreset } from "./presets";

/**
 * Pipeline [B]→[C]→[D] — jantung aplikasi.
 * Setiap tahap bisa dijalankan ulang (idempotent): panggilan baru
 * menggantikan hasil lama pada proyek yang sama.
 */

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly httpStatus = 500,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

function roundDur(x: number): number {
  return Math.max(4, Math.round(x || 10));
}

export async function requireProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { script: { include: { scenes: true } }, seoPack: true },
  });
  if (!project) {
    throw new PipelineError("Proyek tidak ditemukan.", 404);
  }
  return project;
}

export type PipelineProject = Awaited<ReturnType<typeof requireProject>>;

export function totalScriptSeconds(scenes: { durationSec: number }[]): number {
  return scenes.reduce((a, s) => a + s.durationSec, 0);
}

/** Naskah final (gabungan narasi semua scene, sesuai urutan). */
export function composeFullText(
  scenes: { beat: string; narration: string }[],
): string {
  return scenes.map((s) => s.narration).filter(Boolean).join("\n\n");
}

// ===================================================================
// [B] Naskah
// ===================================================================
export async function runScriptStage(projectId: string, req: AiRequest) {
  const project = await requireProject(projectId);
  if (!project.transcript?.trim()) {
    throw new PipelineError(
      "Transkrip belum tersedia. Jalankan tahap Ingest (URL/paste teks) terlebih dulu.",
      400,
    );
  }

  const preset = getPreset(project.stylePreset);
  const { provider } = await createAiProvider(req);

  const out = await provider.buildNaskah({
    transcript: project.transcript,
    stylePresetId: preset.id,
    styleLabel: preset.label,
    styleArahan: preset.arahanNarasi,
    targetMinutes: project.targetMinutes,
    videoTitle: project.videoTitle,
    videoAuthor: project.videoAuthor,
    sourceUrl: project.sourceUrl,
    sourceLang: project.sourceLang,
    model: req.model,
  });

  const targetWords = Math.round(project.targetMinutes * 140);

  await prisma.$transaction(async (tx) => {
    // replace naskah lama (idempotent)
    const old = await tx.script.findUnique({ where: { projectId } });
    if (old) await tx.script.delete({ where: { id: old.id } });

    const script = await tx.script.create({
      data: {
        projectId,
        hookVariants: JSON.stringify(out.hook_variants),
        hookVariant: out.hook_terpilih,
        hookReason: out.alasan_hook,
        fullText: "",
        targetWords,
      },
    });

    for (let i = 0; i < out.scenes.length; i++) {
      const s = out.scenes[i];
      await tx.scene.create({
        data: {
          scriptId: script.id,
          order: i + 1,
          beat: s.beat,
          narration: s.narasi,
          durationSec: roundDur(s.estimasi_detik),
          openLoop: s.open_loop ?? null,
          voNote: s.catatan_vo ?? "",
        },
      });
    }

    // naskah final utk Script.fullText
    const scenes = await tx.scene.findMany({
      where: { scriptId: script.id },
      orderBy: { order: "asc" },
    });
    await tx.script.update({
      where: { id: script.id },
      data: { fullText: composeFullText(scenes) },
    });
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "scripted" },
  });

  return refreshDetail(projectId);
}

// ===================================================================
// [C] Scene Cards — media untuk SEMUA scene
// ===================================================================
export async function runSceneMediaStage(projectId: string, req: AiRequest) {
  const project = await requireProject(projectId);
  const script = project.script;
  if (!script || script.scenes.length === 0) {
    throw new PipelineError("Belum ada naskah. Jalankan tahap Naskah dulu.", 400);
  }
  const scenes = [...script.scenes].sort((a, b) => a.order - b.order);

  const preset = getPreset(project.stylePreset);
  const { provider } = await createAiProvider(req);

  const items: NarrationItem[] = scenes.map((s) => ({
    order: s.order,
    beat: s.beat,
    narasi: s.narration,
    open_loop: s.openLoop,
  }));

  const mediaCtx: SceneMediaContext = {
    scenes: items,
    styleArahanVisual: preset.arahanVisual,
    transcript: project.transcript,
    model: req.model,
  };
  const media = await provider.buildSceneMedia(mediaCtx);

  // petakan hasil berdasarkan order
  const byOrder = new Map(media.scenes.map((m) => [m.order, m]));

  await prisma.$transaction(async (tx) => {
    for (const sc of scenes) {
      const m = byOrder.get(sc.order);
      if (!m) continue;
      await tx.scene.update({
        where: { id: sc.id },
        data: {
          brollKeywords: JSON.stringify(m.broll_keywords ?? []),
          sfx: JSON.stringify(m.sfx ?? []),
          musicMood: m.music_mood ?? "",
          aiImagePrompt: m.ai_image_prompt ?? "",
          archiveSuggestion: m.archive_suggestion ?? null,
          transition: m.transition || "cut",
        },
      });
    }
  });

  if (project.status !== "packaged") {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "packaged" },
    });
  }
  return refreshDetail(projectId);
}

// ===================================================================
// [D] SEO Pack
// ===================================================================
export async function runSeoStage(projectId: string, req: AiRequest) {
  const project = await requireProject(projectId);
  if (!project.script || project.script.scenes.length === 0) {
    throw new PipelineError("Belum ada naskah. Jalankan tahap Naskah dulu.", 400);
  }
  const scenes = [...project.script.scenes].sort(
    (a, b) => a.order - b.order,
  );
  const preset = getPreset(project.stylePreset);
  const { provider } = await createAiProvider(req);

  const seoCtx: SeoContext = {
    title: project.title || "Hikayat Nusantara",
    transcript: project.transcript ?? "",
    targetMinutes: project.targetMinutes,
    styleLabel: preset.label,
    sourceUrl: project.sourceUrl,
    scenes: scenes.map((s) => ({
      order: s.order,
      beat: s.beat,
      narasi: s.narration,
      durasi: s.durationSec,
    })),
    model: req.model,
  };
  const seo = await provider.buildSeo(seoCtx);

  await prisma.seoPack.upsert({
    where: { projectId },
    update: { payload: JSON.stringify(seo) },
    create: { projectId, payload: JSON.stringify(seo) },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "packaged" },
  });
  return refreshDetail(projectId);
}

// ===================================================================
// Utilitas detail untuk respons API
// ===================================================================
export async function refreshDetail(projectId: string) {
  const project = await requireProject(projectId);
  return serializeDetail(project);
}

/** Bentuk JSON aman untuk dikirim ke client (server component & fetch). */
export function serializeDetail(p: PipelineProject) {
  const scenes = p.script
    ? [...p.script.scenes].sort((a, b) => a.order - b.order).map((s) => ({
        id: s.id,
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

  return {
    id: p.id,
    title: p.title,
    sourceUrl: p.sourceUrl,
    sourceType: p.sourceType,
    sourceLang: p.sourceLang,
    transcript: p.transcript,
    status: p.status,
    stylePreset: p.stylePreset,
    targetMinutes: p.targetMinutes,
    videoTitle: p.videoTitle,
    videoAuthor: p.videoAuthor,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    transcriptMethodNote:
      p.transcript && p.sourceUrl
        ? "diambil dari sumber"
        : p.transcript
          ? "dari teks tempel"
          : null,
    script: p.script
      ? {
          id: p.script.id,
          hookVariants: parseArr<{ teknik: string; teks: string }>(
            p.script.hookVariants,
          ),
          hookVariant: p.script.hookVariant,
          hookReason: p.script.hookReason,
          fullText: p.script.fullText,
          targetWords: p.script.targetWords,
          totalDurationSec: scenes.reduce(
            (a, s) => a + s.durationSec,
            0,
          ),
          totalWords: scenes.reduce(
            (a, s) => a + (s.narration.match(/\S+/g)?.length ?? 0),
            0,
          ),
          scenes,
        }
      : null,
    seoPack: p.seoPack
      ? parseSeoPayload(p.seoPack.payload)
      : null,
  };
}

export type ProjectDetail = ReturnType<typeof serializeDetail>;

export function parseStrArr(v: string | null): string[] {
  if (!v) return [];
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x.map(String) : [];
  } catch {
    return [];
  }
}

export function parseArr<T>(v: string): T[] {
  if (!v) return [];
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? (x as T[]) : [];
  } catch {
    return [];
  }
}

export function parseSeoPayload(payload: string): unknown {
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
