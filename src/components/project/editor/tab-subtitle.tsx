"use client";

import * as React from "react";
import {
  Captions,
  Download,
  Languages,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { fmtClock } from "@/lib/utils";
import {
  buildCues,
  cuesToSrt,
  groupCuesByScene,
  srtTimestamp,
  type NarrationInput,
} from "@/lib/srt";
import { postJson } from "@/lib/client/api";
import { downloadBlob, CopyButton } from "@/components/app/copy-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEditor } from "./editor-context";

export function SubtitleTab() {
  const { p } = useEditor();
  const scenes = [...p.script!.scenes].sort((a, b) => a.order - b.order);

  const idInputs: NarrationInput[] = React.useMemo(
    () =>
      scenes.map((s) => ({
        order: s.order,
        narasi: s.narration,
        durasiSec: s.durationSec,
      })),
    [scenes],
  );

  const idCues = React.useMemo(() => buildCues(idInputs), [idInputs]);
  const idGroups = React.useMemo(() => groupCuesByScene(idCues), [idCues]);

  const [enBusy, setEnBusy] = React.useState(false);
  const [enCues, setEnCues] = React.useState<
    ReturnType<typeof buildCues> | null
  >(null);
  const [enGroups, setEnGroups] = React.useState<
    ReturnType<typeof groupCuesByScene> | null
  >(null);
  const enLinesRef = React.useRef<string[]>([]);

  const srtId = React.useMemo(() => cuesToSrt(idCues), [idCues]);

  const downloadId = () => {
    downloadBlob(new Blob([srtId], { type: "text/plain;charset=utf-8" }), `subtitle-id.srt`);
    toast.success("subtitle-id.srt diunduh");
  };

  const translateEn = async () => {
    if (enBusy) return;
    setEnBusy(true);
    try {
      const res = await postJson<{ lines: string[] }>(
        `/api/projects/${p.id}/subtitles/en`,
        {},
      );
      enLinesRef.current = res.lines;
      const inputsEn: NarrationInput[] = scenes.map((s, i) => ({
        order: s.order,
        narasi: res.lines[i] ?? s.narration,
        durasiSec: s.durationSec,
      }));
      const c = buildCues(inputsEn);
      setEnCues(c);
      setEnGroups(groupCuesByScene(c));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menerjemahkan.");
    } finally {
      setEnBusy(false);
    }
  };

  const downloadEn = () => {
    if (!enCues) return;
    downloadBlob(
      new Blob([cuesToSrt(enCues)], { type: "text/plain;charset=utf-8" }),
      `subtitle-en.srt`,
    );
    toast.success("subtitle-en.srt diunduh");
  };

  const totalMs = idCues.length ? idCues[idCues.length - 1].endMs : 0;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Captions className="h-4 w-4 text-gold" /> Subtitle
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={downloadId}>
                <Download className="h-4 w-4" /> Unduh .srt (ID)
              </Button>
              {!enCues ? (
                <Button size="sm" variant="outline" onClick={translateEn} disabled={enBusy}>
                  {enBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Menerjemahkan…
                    </>
                  ) : (
                    <>
                      <Languages className="h-4 w-4" /> Buat versi EN
                    </>
                  )}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={downloadEn}>
                  <Download className="h-4 w-4" /> Unduh .srt (EN)
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            {idCues.length} baris · durasi total {fmtClock(totalMs / 1000)} ·
            timing proporsional dari estimasi durasi tiap scene.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* ID preview */}
        <PreviewPane
          title="Bahasa Indonesia"
          groups={idGroups}
          srtText={srtId}
        />
        {/* EN preview */}
        {enCues && enGroups ? (
          <PreviewPane
            title="English (terjemahan AI)"
            groups={enGroups}
            srtText={cuesToSrt(enCues)}
          />
        ) : (
          <Card className="h-full">
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <Languages className="h-7 w-7 text-muted-foreground" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Terjemahan ke bahasa Inggris untuk subtitle kedua. Butuh mesin AI
                (Gemini gratis / Anthropic). Tanpa kunci AI, hasilnya hanyalah
                contoh [mode uji].
              </p>
              {enBusy && (
                <RefreshCw className="h-5 w-5 animate-spin text-gold" />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PreviewPane({
  title,
  groups,
  srtText,
}: {
  title: string;
  groups: ReturnType<typeof groupCuesByScene>;
  srtText: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CopyButton value={srtText} label="Salin SRT" />
      </CardHeader>
      <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto pr-2">
        {groups.map((g) => {
          const beat =
            g.cues[0]?.sceneOrder !== undefined
              ? g.cues[0].sceneOrder
              : 0;
          const beatLabel =
            // cari scene label via order → hanya angka, warna dari order genap? biar sederhana
            `Scene ${beat}`;
          return (
            <details key={g.sceneOrder} open={groups.length <= 3} className="group rounded-md border border-border/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-card/60 px-3 py-2 text-xs font-medium text-gold-soft">
                <span>{beatLabel}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {srtTimestamp(g.startMs)} → {srtTimestamp(g.endMs)}
                </span>
              </summary>
              <div className="space-y-1 px-3 py-2">
                {g.cues.map((c) => (
                  <div
                    key={c.index}
                    className="flex items-start gap-2 rounded px-2 py-1 text-xs odd:bg-muted/40"
                  >
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {srtTimestamp(c.startMs)}
                    </span>
                    <span className="leading-relaxed text-foreground/85">
                      {c.text}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
        {groups.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Tidak ada subtitle (scene kosong?).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
