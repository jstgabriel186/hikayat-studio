import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { err, ok } from "@/lib/http";
import { isYoutubeUrl } from "@/lib/transcript";
import { getPreset } from "@/lib/presets";

export const dynamic = "force-dynamic";

/** Daftar project utk dashboard. */
export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      stylePreset: true,
      targetMinutes: true,
      sourceUrl: true,
      sourceType: true,
      createdAt: true,
      updatedAt: true,
      script: { select: { id: true } },
      _count: { select: { assets: true } },
    },
  });
  const list = projects.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    stylePreset: p.stylePreset,
    styleLabel: getPreset(p.stylePreset).label,
    targetMinutes: p.targetMinutes,
    sourceUrl: p.sourceUrl,
    sourceType: p.sourceType,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    hasScript: !!p.script,
    assetCount: p._count.assets,
  }));
  return ok(list);
}

interface CreateBody {
  title?: string;
  sourceType?: "url" | "text";
  sourceUrl?: string;
  sourceText?: string;
  stylePreset?: string;
  targetMinutes?: number;
}

/** Buat project baru (tahap [A] untuk mode paste-teks langsung diisi di sini). */
export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return err("Body request tidak valid.", 400);
  }

  const stylePreset = body.stylePreset ?? "sinematik-misterius";
  if (!getPreset(stylePreset)) {
    return err("Preset gaya tidak dikenal.", 400);
  }
  const targetMinutes = Math.min(
    20,
    Math.max(5, Number(body.targetMinutes ?? 10) || 10),
  );
  const sourceType =
    body.sourceType === "text" ? "text" : isYoutubeUrl(body.sourceUrl ?? "")
      ? "url"
      : "text";

  let transcript: string | null = null;
  let status = "draft";
  let autoTitle = "Proyek Hikayat Baru";

  if (sourceType === "text") {
    const t = (body.sourceText ?? "").trim();
    if (t.length < 40) {
      return err(
        "Teks sumber terlalu pendek (minimal ±40 karakter) — atau tempel link YouTube yang valid.",
        400,
      );
    }
    transcript = t;
    status = "transcribed";
    const firstLine = t.split("\n").find((x) => x.trim().length > 0) ?? t;
    autoTitle = (body.title ?? "").trim() || firstLine.slice(0, 45).trim();
  } else {
    if (!isYoutubeUrl(body.sourceUrl ?? "")) {
      return err(
        "Link YouTube tidak dikenali. Gunakan format youtube.com/watch?v=…, youtu.be/…, atau youtube.com/shorts/… — atau pilih mode 'Tempel teks'.",
        400,
      );
    }
    autoTitle = (body.title ?? "").trim() || "Hikayat dari Video YouTube";
  }

  const project = await prisma.project.create({
    data: {
      title: autoTitle,
      sourceUrl: sourceType === "url" ? body.sourceUrl?.trim() : null,
      sourceType,
      transcript,
      status,
      stylePreset,
      targetMinutes,
    },
  });

  return ok(
    { id: project.id, status: project.status, sourceType: project.sourceType },
    { status: 201 },
  );
}
