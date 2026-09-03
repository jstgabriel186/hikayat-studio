import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { err, ok } from "@/lib/http";
import { requireProject, refreshDetail } from "@/lib/pipeline";
import { ingestYoutubeUrl, ensureStorage, isYoutubeUrl } from "@/lib/transcript";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Tahap [A] INGEST — unduh transkrip + metadata dari URL YouTube.
 * (Mode paste-teks tidak memanggil endpoint ini; teks disimpan saat create.)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { sourceUrl?: string };
  try {
    body = await req.json();
  } catch {
    return err("Body tidak valid.", 400);
  }

  let project;
  try {
    project = await requireProject(id);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Proyek tidak ditemukan.", 404);
  }

  try {
    const sourceUrl = (body.sourceUrl ?? "").trim();
    if (!isYoutubeUrl(sourceUrl)) {
      return err("Link YouTube tidak dikenali.", 400);
    }

    const storageDir = await ensureStorage();
    const res = await ingestYoutubeUrl(sourceUrl, {
      storageDir,
      openaiApiKey: process.env.OPENAI_API_KEY,
      whisperModel: process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1",
    });

    const needsAutoTitle = project.title === "Hikayat dari Video YouTube";
    const updated = await prisma.project.update({
      where: { id },
      data: {
        transcript: res.transcript,
        sourceUrl,
        sourceType: "url",
        sourceLang: res.sourceLang,
        videoTitle: res.videoTitle ?? undefined,
        videoAuthor: res.videoAuthor ?? undefined,
        audioUrl: res.audioUrl ?? undefined,
        status: "transcribed",
        ...(needsAutoTitle && res.videoTitle
          ? { title: res.videoTitle.slice(0, 120) }
          : {}),
      },
    });

    return ok({
      ...(await refreshDetail(id)),
      transcriptMethod: res.method,
      transcriptNote: res.note,
      metaNote: updated.videoTitle
        ? `“${updated.videoTitle}” oleh ${updated.videoAuthor ?? "—"}`
        : null,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Ingest gagal.", 500);
  }
}
