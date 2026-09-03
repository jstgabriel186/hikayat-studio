import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { err } from "@/lib/http";
import { buildExportZip } from "@/lib/export";
import { requireProject, PipelineError } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Export ZIP 1-klik. Param query:
 *  - includeEn=0 → tanpa subtitle EN (tidak memanggil LLM terjemahan)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const includeEn = url.searchParams.get("includeEn") !== "0";

  try {
    const project = await requireProject(id);
    const { buffer, folderName } = await buildExportZip(id, { includeEn });

    // status naik ke "exported" bila sudah punya materi
    const doneStatuses = ["packaged", "scripted", "transcribed"];
    if (doneStatuses.includes(project.status)) {
      await prisma.project.update({
        where: { id },
        data: { status: "exported" },
      });
    }

    const fileName = `${folderName}.zip`;
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof PipelineError) return err(e.message, e.httpStatus);
    return err(e instanceof Error ? e.message : "Export gagal.", 500);
  }
}
