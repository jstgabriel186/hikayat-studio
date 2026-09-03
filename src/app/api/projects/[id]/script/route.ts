import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { err, ok, pickAiRequest, jsonErrorToMessage } from "@/lib/http";
import { runScriptStage, PipelineError, requireProject, refreshDetail } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 dtk = batas Vercel Hobby; abaikan di Render/lokal

/** Tahap [B] Naskah — dari transkrip + preset + durasi. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    /* tanpa body = pakai default */
  }
  try {
    const detail = await runScriptStage(id, pickAiRequest(body));
    return ok(detail);
  } catch (e) {
    if (e instanceof PipelineError) return err(e.message, e.httpStatus);
    return err(jsonErrorToMessage(e), 500);
  }
}

/** Simpan pilihan hook / catatan dari editor (tanpa menulis ulang scene). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { hookVariant?: string; hookReason?: string };
  try {
    body = await req.json();
  } catch {
    return err("Body tidak valid.", 400);
  }
  try {
    const project = await requireProject(id);
    if (!project.script) {
      return err("Belum ada naskah.", 400);
    }
    const data: Record<string, unknown> = {};
    if (typeof body.hookVariant === "string") data.hookVariant = body.hookVariant;
    if (typeof body.hookReason === "string") data.hookReason = body.hookReason;
    await prisma.script.update({ where: { id: project.script.id }, data });
    return ok(await refreshDetail(id));
  } catch (e) {
    return err(jsonErrorToMessage(e), 500);
  }
}
