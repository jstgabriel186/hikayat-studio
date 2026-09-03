"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Captions,
  Clapperboard,
  Package,
  Pencil,
  Play,
  RotateCcw,
  ScrollText,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { fmtDateTime, fmtClock } from "@/lib/utils";
import { statusMeta } from "@/lib/status";
import { getPresetLabel } from "@/lib/presets";
import { postJson } from "@/lib/client/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineTimeline, type PipelineState } from "@/components/project/pipeline-timeline";
import { AiModePill } from "@/components/app/ai-mode-pill";
import { EditorProvider, useEditor, type BusyMap } from "./editor-context";
import { NaskahTab } from "./tab-naskah";
import { SceneCardsTab } from "./tab-scenes";
import { SeoTab } from "./tab-seo";
import { SubtitleTab } from "./tab-subtitle";
import { ExportTab } from "./tab-export";
import type { ProjectDetailC } from "./types";

function usePipelineReady(p: ProjectDetailC) {
  const ingest = !!p.transcript || p.sourceType !== "url";
  const naskah = !!p.script;
  const media =
    !!p.script && p.script.scenes.length > 0 &&
    p.script.scenes.every((s) => s.aiImagePrompt.trim().length > 0);
  const seo = !!p.seoPack;
  const idle: PipelineState = {
    ingest: ingest ? "done" : "idle",
    naskah: naskah ? "done" : "idle",
    media: media ? "done" : "idle",
    seo: seo ? "done" : "idle",
  };
  return { ingest, naskah, media, seo, idle };
}

export function ProjectEditor({
  projectId,
  initial,
}: {
  projectId: string;
  initial: ProjectDetailC;
}) {
  return (
    <EditorProvider projectId={projectId} initial={initial}>
      <EditorInner />
    </EditorProvider>
  );
}

function TitleEditor() {
  const { p, rename } = useEditor();
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(p.title);
  // ikuti perubahan judul dari server (rename selesai / muat ulang)
  const [prevTitle, setPrevTitle] = React.useState(p.title);
  if (prevTitle !== p.title) {
    setPrevTitle(p.title);
    setTitle(p.title);
  }

  const save = async () => {
    setEditing(false);
    const t = title.trim();
    if (t && t !== p.title) await rename(t);
    else setTitle(p.title);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl leading-tight text-balance sm:text-3xl">
          {p.title}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Ubah judul"
          className="text-muted-foreground hover:text-gold cursor-pointer"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex max-w-xl items-center gap-2">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className="h-9 font-display text-xl"
      />
      <Button size="sm" onClick={save}>
        Simpan
      </Button>
    </div>
  );
}

function PipelineBanner() {
  const { p } = useEditor();
  const ready = usePipelineReady(p);
  const [running, setRunning] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [live, setLive] = React.useState<PipelineState | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const plan = React.useMemo(() => {
    const arr: Array<{ key: string; timeline: keyof PipelineState }> = [];
    if (p.sourceType === "url" && !p.transcript) {
      arr.push({ key: "ingest", timeline: "ingest" });
    }
    if (!p.script) {
      arr.push({ key: "script", timeline: "naskah" });
      arr.push({ key: "media", timeline: "media" });
      arr.push({ key: "seo", timeline: "seo" });
    } else {
      if (!p.script.scenes.every((s) => s.aiImagePrompt.trim().length > 0)) {
        arr.push({ key: "media", timeline: "media" });
      }
      if (!p.seoPack) arr.push({ key: "seo", timeline: "seo" });
    }
    return arr;
  }, [p]);

  const allDone = plan.length === 0;

  const run = async () => {
    if (running) return;
    setRunning(true);
    setErrorMsg(null);
    const base = { ...ready.idle };
    // reset status dari sini
    setLive(base);
    for (let i = 0; i < plan.length; i++) {
      const step = plan[i];
      setNote(
        step.key === "ingest"
          ? "Mengambil transkrip YouTube…"
          : step.key === "script"
            ? "Menyusun naskah orisinal…"
            : step.key === "media"
              ? "Merancang scene cards…"
              : "Menyusun SEO pack…",
      );
      setLive((s) => ({ ...s!, [step.timeline]: "running" }));
      try {
        let endpoint: string;
        if (step.key === "ingest") {
          endpoint = `/api/projects/${p.id}/ingest`;
        } else {
          endpoint = `/api/projects/${p.id}/${step.key}`;
        }
        await postJson<ProjectDetailC>(endpoint, {
          ...(step.key === "ingest" ? { sourceUrl: p.sourceUrl } : {}),
        });
        setLive((s) => ({ ...s!, [step.timeline]: "done" }));
      } catch (e) {
        setLive((s) => ({ ...s!, [step.timeline]: "error" }));
        const msg = e instanceof Error ? e.message : "Gagal.";
        setErrorMsg(msg);
        toast.error(msg);
        setRunning(false);
        return;
      }
    }
    setRunning(false);
    setLive(null);
    toast.success("Pipeline selesai — semua bahan sudah siap.");
    // muat ulang dari server
    window.location.reload();
  };

  if (allDone) return null;

  const failedIdx = plan.findIndex((s) => live?.[s.timeline] === "error");

  return (
    <Card className="border-gold/25 bg-gold/[0.04]">
      <CardContent className="flex flex-col gap-4 px-5 py-5">
        {running || live ? (
          <>
            <PipelineTimeline state={live ?? ready.idle} compact />
            <div className="flex items-center gap-2 text-sm text-foreground/85">
              <Wand2 className="h-4 w-4 animate-pulse text-gold" />
              {note}
            </div>
            {failedIdx !== -1 && (
              <div className="flex flex-col gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3">
                <p className="text-sm text-red-300">{errorMsg}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => void run()}
                >
                  <RotateCcw className="h-4 w-4" /> Ulangi dari tahap gagal
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-gold-soft">
                Proyek belum lengkap — {plan.length} tahap bisa dijalankan
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {plan
                  .map((s) =>
                    s.key === "ingest"
                      ? "Ingest"
                      : s.key === "script"
                        ? "Naskah"
                        : s.key === "media"
                          ? "Scene Cards"
                          : "SEO",
                  )
                  .join(" → ")}{" "}
              </p>
            </div>
            <Button onClick={() => void run()}>
              <Play className="h-4 w-4" /> Jalankan Pipeline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditorInner() {
  const { p, busy } = useEditor();
  const ready = usePipelineReady(p);
  const meta = statusMeta(p.status);
  const presetLabel = getPresetLabel(p.stylePreset);
  const [tab, setTab] = React.useState<string>(
    p.script ? "naskah" : p.transcript ? "naskah" : "naskah",
  );

  const tabsDisabled: Record<string, boolean> = {
    naskah: !p.transcript,
    media: !p.script,
    seo: !p.script,
    subtitle: !p.script,
    export: !p.script,
  };

  const tabBusy: Record<string, boolean> = {
    naskah: Boolean(busy["script"]),
    media: Boolean(busy["media"]),
    seo: Boolean(busy["seo"]),
  };

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
      </Link>

      {/* Header proyek */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <TitleEditor />
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <span>{presetLabel}</span>
            <span>Target {p.targetMinutes} menit</span>
            {p.script && (
              <span>
                Est. {fmtClock(p.script.totalDurationSec)} ·{" "}
                {p.script.totalWords} kata
              </span>
            )}
            <span>Diperbarui {fmtDateTime(p.updatedAt)}</span>
          </p>
          {p.videoTitle && (
            <p className="mt-1 text-[11px] text-muted-foreground/80">
              Sumber: “{p.videoTitle}”{p.videoAuthor ? ` — ${p.videoAuthor}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AiModePill className="hidden sm:inline-flex" />
          <Badge
            variant={p.script?.scenes.every((s) => s.aiImagePrompt) ? "success" : "outline"}
            className="hidden sm:inline-flex"
          >
            {p.script?.scenes.every((s) => s.aiImagePrompt)
              ? "Scene Cards lengkap"
              : p.script
                ? "Scene Cards belum dibuat"
                : "Belum ada naskah"}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/project/new">+ Proyek Baru</Link>
          </Button>
        </div>
      </div>

      {/* Banner pipeline bila belum lengkap */}
      <div className="mb-6">
        <PipelineBanner />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto w-max flex-nowrap">
            <TabsTrigger value="naskah" disabled={tabsDisabled.naskah}>
              <ScrollText className="h-4 w-4" /> Naskah
            </TabsTrigger>
            <TabsTrigger value="media" disabled={tabsDisabled.media}>
              <Clapperboard className="h-4 w-4" /> Scene Cards
            </TabsTrigger>
            <TabsTrigger value="seo" disabled={tabsDisabled.seo}>
              <TrendingUp className="h-4 w-4" /> SEO
            </TabsTrigger>
            <TabsTrigger value="subtitle" disabled={tabsDisabled.subtitle}>
              <Captions className="h-4 w-4" /> Subtitle
            </TabsTrigger>
            <TabsTrigger value="export" disabled={tabsDisabled.export}>
              <Package className="h-4 w-4" /> Export
            </TabsTrigger>
          </TabsList>
        </div>

        {tabBusy.naskah && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gold">
            <Wand2 className="h-3.5 w-3.5 animate-pulse" /> Menyusun naskah…
          </div>
        )}

        <TabsContent value="naskah">
          {p.transcript ? <NaskahTab /> : <EmptyTab msg="Transkrip belum tersedia. Jalankan Pipeline di atas." />}
        </TabsContent>
        <TabsContent value="media">
          {p.script ? <SceneCardsTab /> : <EmptyTab msg="Buat naskah dulu (tab Naskah / jalankan Pipeline)." />}
        </TabsContent>
        <TabsContent value="seo">
          {p.script ? <SeoTab /> : <EmptyTab msg="Buat naskah dulu." />}
        </TabsContent>
        <TabsContent value="subtitle">
          {p.script ? <SubtitleTab /> : <EmptyTab msg="Buat naskah dulu." />}
        </TabsContent>
        <TabsContent value="export">
          {p.script ? <ExportTab ready={ready} /> : <EmptyTab msg="Buat naskah dulu." />}
        </TabsContent>
      </Tabs>

      <p className="mt-10 text-center text-[11px] text-muted-foreground/70">
        Hikayat menyiapkan bahan — kamu yang merakit &amp; mengedit di CapCut.
      </p>
    </div>
  );
}

function EmptyTab({ msg }: { msg: string }) {
  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <p className="max-w-md text-sm text-muted-foreground">{msg}</p>
      </CardContent>
    </Card>
  );
}

export type { BusyMap };
