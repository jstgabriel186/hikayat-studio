import { NextRequest } from "next/server";
import { err, ok, pickAiRequest, jsonErrorToMessage } from "@/lib/http";
import { runScriptStage, PipelineError } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
