import { NextRequest } from "next/server";
import { err, ok, pickAiRequest, jsonErrorToMessage } from "@/lib/http";
import { requireProject, PipelineError } from "@/lib/pipeline";
import { createAiProvider } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 dtk = batas Vercel Hobby; abaikan di Render/lokal

/**
 * Terjemahkan narasi per scene ke bahasa Inggris (dasar subtitle EN).
 * Client menyusun ulang .srt memakai timing scene yang sama.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    /* tanpa body */
  }

  try {
    const project = await requireProject(id);
    const scenes = project.script?.scenes;
    if (!scenes || scenes.length === 0) {
      throw new PipelineError("Belum ada naskah untuk diterjemahkan.", 400);
    }
    const sorted = [...scenes].sort((a, b) => a.order - b.order);

    const { provider } = await createAiProvider(pickAiRequest(body));
    const lines = await provider.translateLines(
      sorted.map((s) => s.narration),
      project.sourceLang,
    );

    return ok({
      lines,
      durations: sorted.map((s) => ({
        order: s.order,
        durasi: s.durationSec,
      })),
      provider: provider.describe(),
      mock: provider.meta.id === "mock",
    });
  } catch (e) {
    if (e instanceof PipelineError) return err(e.message, e.httpStatus);
    return err(jsonErrorToMessage(e), 500);
  }
}
