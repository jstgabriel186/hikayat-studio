import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { err, ok, jsonErrorToMessage } from "@/lib/http";
import {
  requireProject,
  refreshDetail,
  composeFullText,
} from "@/lib/pipeline";

export const dynamic = "force-dynamic";

/** Edit inline scene: narasi / open loop / catatan VO / durasi. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> },
) {
  const { id, sceneId } = await params;
  let body: {
    narration?: string;
    openLoop?: string | null;
    voNote?: string | null;
    durationSec?: number;
  };
  try {
    body = await req.json();
  } catch {
    return err("Body tidak valid.", 400);
  }

  try {
    const project = await requireProject(id);
    const scene = project.script?.scenes.find((s) => s.id === sceneId);
    if (!project.script || !scene) {
      return err("Scene tidak ditemukan.", 404);
    }

    const data: Record<string, unknown> = {};
    if (typeof body.narration === "string") {
      if (!body.narration.trim()) {
        return err("Narasi tidak boleh kosong.", 400);
      }
      data.narration = body.narration;
    }
    if (typeof body.openLoop === "string" || body.openLoop === null) {
      data.openLoop = body.openLoop || null;
    }
    if (typeof body.voNote === "string" || body.voNote === null) {
      data.voNote = body.voNote || "";
    }
    if (
      typeof body.durationSec === "number" &&
      body.durationSec >= 4 &&
      body.durationSec <= 600
    ) {
      data.durationSec = Math.round(body.durationSec);
    }

    await prisma.scene.update({ where: { id: sceneId }, data });

    // perbarui fullText gabungan
    const scenes = await prisma.scene.findMany({
      where: { scriptId: project.script.id },
      orderBy: { order: "asc" },
    });
    await prisma.script.update({
      where: { id: project.script.id },
      data: { fullText: composeFullText(scenes) },
    });

    return ok(await refreshDetail(id));
  } catch (e) {
    return err(jsonErrorToMessage(e), 500);
  }
}
