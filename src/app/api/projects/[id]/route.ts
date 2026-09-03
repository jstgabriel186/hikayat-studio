import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { err, ok } from "@/lib/http";
import { requireProject, refreshDetail } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

/** Detail penuh proyek (dipakai editor). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await requireProject(id);
    return ok(await refreshDetail(id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat proyek.";
    const status = msg.includes("tidak ditemukan") ? 404 : 500;
    return err(msg, status);
  }
}

interface PatchBody {
  title?: string;
}

/** Ubah judul kerja proyek. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return err("Body tidak valid.", 400);
  }
  const title = (body.title ?? "").trim();
  if (!title) return err("Judul tidak boleh kosong.", 400);

  try {
    await requireProject(id);
    await prisma.project.update({
      where: { id },
      data: { title: title.slice(0, 120) },
    });
    return ok(await refreshDetail(id));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Gagal memperbarui.", 500);
  }
}
