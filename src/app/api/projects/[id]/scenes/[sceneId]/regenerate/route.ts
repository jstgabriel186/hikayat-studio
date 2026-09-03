import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { err, ok, pickAiRequest, jsonErrorToMessage } from "@/lib/http";
import {
  requireProject,
  refreshDetail,
  composeFullText,
  PipelineError,
} from "@/lib/pipeline";
import { createAiProvider } from "@/lib/ai/provider";
import { getPreset } from "@/lib/presets";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 dtk = batas Vercel Hobby; abaikan di Render/lokal

/**
 * Regenerate SATU scene:
 *  - kind "narration": tulis ulang narasi (dgn konteks scene sebelum/sesudah)
 *  - kind "media"    : buat ulang scene card (keywords, SFX, prompt, dst.)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> },
) {
  const { id, sceneId } = await params;
  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    /* tanpa body */
  }
  const kind = body?.kind === "media" ? "media" : "narration";

  try {
    const project = await requireProject(id);
    const script = project.script;
    if (!script) throw new PipelineError("Belum ada naskah.", 400);
    const scenes = [...script.scenes].sort((a, b) => a.order - b.order);
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene) throw new PipelineError("Scene tidak ditemukan.", 404);

    const preset = getPreset(project.stylePreset);
    const { provider } = await createAiProvider(pickAiRequest(body));

    if (kind === "narration") {
      const idx = scenes.findIndex((s) => s.id === sceneId);
      const prev = idx > 0 ? scenes[idx - 1] : null;
      const next = idx < scenes.length - 1 ? scenes[idx + 1] : null;

      const regen = await provider.regenerateNarration({
        transcript: project.transcript,
        styleLabel: preset.label,
        styleArahan: preset.arahanNarasi,
        scene: { order: scene.order, beat: scene.beat, narasi: scene.narration },
        prevNarasi: prev?.narration ?? null,
        nextNarasi: next?.narration ?? null,
        model: pickAiRequest(body).model,
      });

      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          narration: regen.narasi,
          durationSec: Math.max(4, Math.round(regen.estimasi_detik || 10)),
          openLoop: regen.open_loop ?? null,
          voNote: regen.catatan_vo ?? "",
        },
      });
    } else {
      const regen = await provider.regenerateMedia({
        scene: {
          order: scene.order,
          beat: scene.beat,
          narasi: scene.narration,
          open_loop: scene.openLoop,
        },
        styleArahanVisual: preset.arahanVisual,
        model: pickAiRequest(body).model,
      });
      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          brollKeywords: JSON.stringify(regen.broll_keywords ?? []),
          sfx: JSON.stringify(regen.sfx ?? []),
          musicMood: regen.music_mood ?? "",
          aiImagePrompt: regen.ai_image_prompt ?? "",
          archiveSuggestion: regen.archive_suggestion ?? null,
          transition: regen.transition || "cut",
        },
      });
    }

    // refresh fullText
    const updatedScenes = await prisma.scene.findMany({
      where: { scriptId: script.id },
      orderBy: { order: "asc" },
    });
    await prisma.script.update({
      where: { id: script.id },
      data: { fullText: composeFullText(updatedScenes) },
    });

    return ok(await refreshDetail(id));
  } catch (e) {
    if (e instanceof PipelineError) return err(e.message, e.httpStatus);
    return err(jsonErrorToMessage(e), 500);
  }
}
