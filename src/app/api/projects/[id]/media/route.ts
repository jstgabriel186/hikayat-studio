import { NextRequest } from "next/server";
import { err, ok, pickAiRequest, jsonErrorToMessage } from "@/lib/http";
import { runSceneMediaStage, PipelineError } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 dtk = batas Vercel Hobby; abaikan di Render/lokal

/** Tahap [C] Scene Cards — media utk semua scene. */
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
    const detail = await runSceneMediaStage(id, pickAiRequest(body));
    return ok(detail);
  } catch (e) {
    if (e instanceof PipelineError) return err(e.message, e.httpStatus);
    return err(jsonErrorToMessage(e), 500);
  }
}
