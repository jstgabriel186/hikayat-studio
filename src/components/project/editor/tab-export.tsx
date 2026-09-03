"use client";

import * as React from "react";
import {
  Check,
  CircleDot,
  Download,
  FolderArchive,
  Loader2,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { downloadBlob } from "@/components/app/copy-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEditor } from "./editor-context";

const FILE_LIST = [
  ["00-NASKAH.md", "Hook terpilih + semua scene dengan catatan VO & open loop"],
  ["01-subtitle-id.srt", "Subtitle Indonesia (timing sesuai estimasi scene)"],
  ["02-subtitle-en.srt", "Subtitle Inggris (terjemahan AI)"],
  ["03-cue-sheet.csv", "Tabel produksi: durasi, keywords, SFX, musik, transisi"],
  ["04-prompts-gambar.txt", "Semua prompt AI image bernomor scene"],
  ["05-SEO-PACK.txt", "Judul terpilih + opsi, deskripsi, chapters, hashtag, tags"],
  ["scenes.json", "Data mentah (cadangan untuk pengembangan lanjutan)"],
];

export function ExportTab({
  ready,
}: {
  ready: { ingest: boolean; naskah: boolean; media: boolean; seo: boolean };
}) {
  const { p, refresh } = useEditor();
  const [includeEn, setIncludeEn] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const checks: Array<{ label: string; ok: boolean }> = [
    { label: "Transkrip sumber", ok: ready.ingest },
    { label: "Naskah (scene & hook)", ok: ready.naskah },
    { label: "Scene Cards (visual/SFX/prompt)", ok: ready.media },
    { label: "SEO Pack", ok: ready.seo },
  ];
  const allOk = checks.every((c) => c.ok);

  const doExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${p.id}/export?includeEn=${includeEn ? 1 : 0}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        let msg = `Export gagal (${res.status}).`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* binary */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      downloadBlob(blob, `hikayat-${slugify(p.title)}.zip`);
      toast.success("ZIP paket produksi diunduh!");
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderArchive className="h-4 w-4 text-gold" /> Paket ZIP siap
            editing
          </CardTitle>
          <CardDescription>
            Folder <code className="text-gold-soft">hikayat-{slugify(p.title)}/</code>{" "}
            berisi 7 berkas produksi — impor ke CapCut lalu rakit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {FILE_LIST.map(([f, d]) => (
            <div
              key={f}
              className="flex items-start gap-2.5 rounded-md border border-border/50 bg-card/40 px-3 py-2"
            >
              <span className="mt-0.5 shrink-0 text-gold">
                <PackageCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-xs text-foreground">{f}</p>
                <p className="text-[11px] text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status kesiapan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checks.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2.5 rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                {c.ok ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <CircleDot className="h-5 w-5 text-muted-foreground/60" />
                )}
                <span className={c.ok ? "" : "text-muted-foreground"}>
                  {c.label}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {c.ok ? "✔ siap" : "belum"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 px-5 py-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/85">
              <input
                type="checkbox"
                checked={includeEn}
                onChange={(e) => setIncludeEn(e.target.checked)}
                className="h-4 w-4 accent-[#c9a227]"
              />
              Sertakan subtitle EN (02-subtitle-en.srt)
            </label>
            <Button
              size="lg"
              onClick={() => void doExport()}
              disabled={busy}
              className="w-full"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Menyusun ZIP…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Unduh ZIP Paket Produksi
                </>
              )}
            </Button>
            {!allOk && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Ada bagian yang belum lengkap — ZIP tetap bisa diunduh, tapi
                isinya baru separuh jalan. Selesaikan lewat banner Pipeline di
                atas untuk hasil penuh.
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Subtitle EN diterjemahkan saat export (butuh mesin AI). Jika
              memakai mode uji, isinya placeholder.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
