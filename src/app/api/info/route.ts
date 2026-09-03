import { createAiProvider } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

/**
 * Info konfigurasi AI aktif — dipakai UI utk menampilkan mode
 * (Gemini gratis / Anthropic / Mode Uji) secara transparan.
 * Tidak membocorkan kunci.
 */
export async function GET() {
  try {
    const { provider, usedMock, reason } = await createAiProvider({});
    return Response.json({
      provider: provider.meta.id,
      label: provider.meta.label,
      describe: provider.describe(),
      usedMock,
      reason,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Terjadi kesalahan." },
      { status: 500 },
    );
  }
}
