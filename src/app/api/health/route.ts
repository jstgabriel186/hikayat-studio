import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Health-check — dipakai hosting (mis. Render) utk cek aplikasi hidup & DB nyambung. */
export async function GET() {
  try {
    const n = await prisma.project.count();
    return Response.json({
      ok: true,
      service: "hikayat-studio",
      projects: n,
      time: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "DB tidak terjangkau" },
      { status: 500 },
    );
  }
}
