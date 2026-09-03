import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { err, ok, pickAiRequest, jsonErrorToMessage } from "@/lib/http";
import { runSeoStage, PipelineError, requireProject, refreshDetail } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 dtk = batas Vercel Hobby; abaikan di Render/lokal

/** Tahap [D] SEO Pack — dari naskah/proyek. */
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
    const detail = await runSeoStage(id, pickAiRequest(body));
    return ok(detail);
  } catch (e) {
    if (e instanceof PipelineError) return err(e.message, e.httpStatus);
    return err(jsonErrorToMessage(e), 500);
  }
}

interface SeoPatch {
  judul_terpilih?: string;
  pinned_comment?: string;
  [key: string]: unknown;
}

/** Perbarui sebagian field payload SEO (mis. tandai judul terpilih). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: SeoPatch;
  try {
    body = await req.json();
  } catch {
    return err("Body tidak valid.", 400);
  }
  try {
    const project = await requireProject(id);
    if (!project.seoPack) {
      return err("SEO pack belum dibuat.", 400);
    }
    const current = JSON.parse(project.seoPack.payload) as Record<string, unknown>;
    const next = { ...current };
    for (const key of Object.keys(body)) {
      if (key === "judul_terpilih" || key === "pinned_comment") {
        next[key] = body[key];
      }
    }
    await prisma.seoPack.update({
      where: { projectId: id },
      data: { payload: JSON.stringify(next) },
    });
    return ok(await refreshDetail(id));
  } catch (e) {
    return err(jsonErrorToMessage(e), 500);
  }
}
