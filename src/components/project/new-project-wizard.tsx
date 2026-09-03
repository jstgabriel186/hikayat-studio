"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  CircleHelp,
  FileText,
  Link2,
  Play,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { postJson } from "@/lib/client/api";
import { STYLE_PRESETS } from "@/lib/presets";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  PipelineTimeline,
  type PipelineState,
  type StepStatus,
} from "@/components/project/pipeline-timeline";
import { AiModePill } from "@/components/app/ai-mode-pill";

type SourceMode = "youtube" | "text";
type ProviderChoice = "auto" | "gemini" | "anthropic" | "mock";

const PROVIDER_OPTIONS: Array<{
  value: ProviderChoice;
  label: string;
  desc: string;
  price: string;
}> = [
  {
    value: "auto",
    label: "Otomatis (disarankan)",
    desc: "Pakai Gemini gratis bila kunci terisi; tanpa kunci apa pun → Mode Uji.",
    price: "gratis*",
  },
  {
    value: "gemini",
    label: "Gemini — gratis",
    desc: "Google AI Studio free tier (gemini-2.5-flash). Kunci gratis tanpa kartu kredit.",
    price: "gratis",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    desc: "Claude Sonnet (per spec). Membutuhkan API key berbayar.",
    price: "berbayar",
  },
  {
    value: "mock",
    label: "Mode Uji",
    desc: "Tanpa AI sungguhan — isi contoh agar alur bisa dicoba offline.",
    price: "gratis",
  },
];

type Phase = "form" | "processing" | "success";

const DEFAULT_STATE: PipelineState = {
  ingest: "idle",
  naskah: "idle",
  media: "idle",
  seo: "idle",
};

function StepsGuide() {
  return (
    <div className="hidden lg:block">
      <div className="space-y-5">
        {[
          {
            t: "Ingest",
            d: "Transkrip video + judul & kanal sumber diambil otomatis. Punya teks artikel? Tempel langsung, tahap ini dilewati.",
          },
          {
            t: "Naskah",
            d: "AI menulis ulang sebagai cerita Indonesia orisinal — 10 varian hook, scene berstruktur hook→setup→konflik→klimaks→refleksi.",
          },
          {
            t: "Media",
            d: "Tiap scene diberi kunci b-roll, SFX, mood musik, prompt gambar AI, saran arsip, dan transisi.",
          },
          {
            t: "SEO",
            d: "Judul, deskripsi, chapters, hashtag, tags, thumbnail — siap tempel ke YouTube Studio.",
          },
        ].map((s, i) => (
          <div key={s.t} className="relative pl-7">
            {i < 3 && (
              <span className="absolute left-[7px] top-7 h-full w-px bg-gradient-to-b from-gold/40 to-transparent" />
            )}
            <span className="absolute left-0 top-1 flex h-4 w-4 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-[9px] font-bold text-gold">
              {i + 1}
            </span>
            <h4 className="text-sm font-semibold text-gold-soft">{s.t}</h4>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              {s.d}
            </p>
          </div>
        ))}
        <p className="mt-6 flex items-start gap-2 rounded-lg border border-gold/15 bg-gold/[0.04] p-3 text-xs leading-relaxed text-muted-foreground">
          <BadgeDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>
            <strong className="text-gold-soft">100% gratis berjalan.</strong>{" "}
            Ambil transkrip &amp; edit semua bahan tanpa biaya. AI sungguhan
            pakai kunci Gemini gratis bila ingin; tanpanya otomatis Mode Uji.
          </span>
        </p>
      </div>
    </div>
  );
}

export function NewProjectWizard() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("form");
  const [busy, setBusy] = React.useState(false);

  // ---- form state ----
  const [mode, setMode] = React.useState<SourceMode>("youtube");
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [stylePreset, setStylePreset] = React.useState(STYLE_PRESETS[0].id);
  const [minutes, setMinutes] = React.useState(10);
  const [provider, setProvider] = React.useState<ProviderChoice>("auto");
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // ---- pipeline state ----
  const [stage, setStage] = React.useState<PipelineState>(DEFAULT_STATE);
  const [currentNote, setCurrentNote] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const cancelled = React.useRef(false);

  const stepKeys: Array<{ key: string; id: keyof PipelineState }> = React.useMemo(() => {
    const arr: Array<{ key: string; id: keyof PipelineState }> = [];
    if (mode === "youtube") arr.push({ key: "ingest", id: "ingest" });
    arr.push({ key: "script", id: "naskah" });
    arr.push({ key: "media", id: "media" });
    arr.push({ key: "seo", id: "seo" });
    return arr;
  }, [mode]);

  const setOne = (id: keyof PipelineState, st: StepStatus) =>
    setStage((s) => ({ ...s, [id]: st }));

  const aiReq = { provider, model: undefined };

  const runFrom = async (startIdx: number, projectIdStr: string) => {
    cancelled.current = false;
    setErrorMsg(null);
    setPhase("processing");
    // reset status tahapan dari startIdx
    setStage((s) => {
      const next = { ...DEFAULT_STATE };
      stepKeys.forEach((st, i) => {
        next[st.id] = i < startIdx ? "done" : "idle";
      });
      return next;
    });

    for (let i = startIdx; i < stepKeys.length; i++) {
      if (cancelled.current) return;
      const step = stepKeys[i];
      setOne(step.id, "running");
      const notes: Record<string, string> = {
        ingest: "Menghubungi YouTube & mengambil transkrip…",
        script: "AI menyusun naskah orisinal (beberapa puluh detik)…",
        media: "Merancang scene cards untuk setiap adegan…",
        seo: "Menyusun SEO pack…",
      };
      setCurrentNote(notes[step.id] ?? "");
      try {
        if (step.id === "ingest") {
          await postJson(`/api/projects/${projectIdStr}/ingest`, {
            sourceUrl: url,
            provider,
          });
        } else if (step.key === "script") {
          await postJson(`/api/projects/${projectIdStr}/script`, aiReq as never);
        } else if (step.key === "media") {
          await postJson(`/api/projects/${projectIdStr}/media`, aiReq as never);
        } else if (step.key === "seo") {
          await postJson(`/api/projects/${projectIdStr}/seo`, aiReq as never);
        }
        setOne(step.id, "done");
      } catch (e) {
        setOne(step.id, "error");
        const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
    }
    setPhase("success");
    toast.success("Paket produksi siap! 🎉");
    router.push(`/project/${projectIdStr}`);
  };

  const submit = async () => {
    if (busy) return;
    // validasi
    if (mode === "youtube") {
      const isYt = /(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)/i.test(
        url.trim(),
      );
      if (!isYt) {
        toast.error("Tempel link YouTube yang valid (youtube.com/watch?v=… atau youtu.be/…).");
        return;
      }
    } else {
      if (text.trim().length < 40) {
        toast.error("Teks sumber terlalu pendek (minimal ±40 karakter).");
        return;
      }
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await postJson<{ id: string }>("/api/projects", {
        title: title.trim() || undefined,
        sourceType: mode,
        sourceUrl: url.trim() || undefined,
        sourceText: text.trim() || undefined,
        stylePreset,
        targetMinutes: minutes,
      });
      setProjectId(res.id);
      await runFrom(0, res.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membuat proyek.";
      toast.error(msg);
      setErrorMsg(msg);
      setPhase("form");
    } finally {
      setBusy(false);
    }
  };

  const retryFrom = (idx: number) => {
    if (projectId) void runFrom(idx, projectId);
  };

  // ---- saat pemrosesan: tampilan progres ----
  if (phase === "processing" || phase === "success") {
    const failedIdx = stepKeys.findIndex((st) => stage[st.id] === "error");
    const runningId = stepKeys.find((st) => stage[st.id] === "running")?.id;
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <Card className="bg-noise">
          <CardContent className="flex flex-col gap-8 px-6 py-10 sm:px-10">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl">
                Menyiapkan paket produksi
              </h1>
              <Link
                href="/"
                className="text-xs text-muted-foreground hover:text-gold-soft"
              >
                Batalkan
              </Link>
            </div>

            <PipelineTimeline state={stage} />

            <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/50 px-4 py-3">
              {runningId ? (
                <Wand2 className="h-5 w-5 animate-pulse text-gold" />
              ) : (
                <Sparkles className="h-5 w-5 text-gold" />
              )}
              <p className="text-sm text-foreground/85">{currentNote || "Memulai…"}</p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>Gaya: {STYLE_PRESETS.find((p) => p.id === stylePreset)?.label}</span>
              <span>Durasi target: {minutes} menit</span>
              <span>
                Provider:{" "}
                {PROVIDER_OPTIONS.find((p) => p.value === provider)?.label}
              </span>
              <AiModePill />
            </div>

            {failedIdx !== -1 && (
              <div className="flex flex-col gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
                <p className="text-sm text-red-300">{errorMsg}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => retryFrom(failedIdx)}
                  >
                    <RotateCcw className="h-4 w-4" /> Ulangi dari tahap yang gagal
                  </Button>
                  <Link
                    href="/"
                    className="text-xs text-muted-foreground hover:text-gold-soft"
                  >
                    Kembali ke Dashboard
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Jangan tutup tab ini. Tahap AI nyata bisa berjalan 30–90 detik.
        </p>
      </div>
    );
  }

  // ---- form ----
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Dashboard
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold-faint">
            Proyek Baru
          </p>
          <h1 className="mt-1 font-display text-3xl text-balance sm:text-4xl">
            Dari satu sumber, jadi paket produksi lengkap
          </h1>

          {/* Pilih sumber */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("youtube")}
              className={cn(
                "group rounded-lg border p-4 text-left transition-all",
                mode === "youtube"
                  ? "border-gold/50 bg-gold/[0.07] shadow-[0_0_24px_-14px_rgba(201,162,39,.9)]"
                  : "border-border bg-card/40 hover:border-gold/25",
              )}
            >
              <Link2
                className={cn(
                  "h-5 w-5",
                  mode === "youtube" ? "text-gold" : "text-muted-foreground",
                )}
              />
              <p className="mt-2 font-semibold">Video YouTube</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Tempel link. Transkrip &amp; metadata diambil otomatis (gratis).
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("text")}
              className={cn(
                "group rounded-lg border p-4 text-left transition-all",
                mode === "text"
                  ? "border-gold/50 bg-gold/[0.07] shadow-[0_0_24px_-14px_rgba(201,162,39,.9)]"
                  : "border-border bg-card/40 hover:border-gold/25",
              )}
            >
              <FileText
                className={cn(
                  "h-5 w-5",
                  mode === "text" ? "text-gold" : "text-muted-foreground",
                )}
              />
              <p className="mt-2 font-semibold">Tempel Teks / Artikel</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Punya artikel atau catatan riset? Tempel langsung.
              </p>
            </button>
          </div>

          <Card className="mt-4">
            <CardContent className="flex flex-col gap-5 px-5 py-6 sm:px-6">
              {/* Judul kerja */}
              <div className="grid gap-2">
                <Label htmlFor="title">Judul kerja (opsional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    mode === "youtube"
                      ? "Mis. Rahasia Pelayaran Nusantara"
                      : "Mis. Jejak Pelaut Bugis ke Australia"
                  }
                  maxLength={120}
                />
              </div>

              {/* Sumber */}
              {mode === "youtube" ? (
                <div className="grid gap-2">
                  <Label htmlFor="url">Link YouTube</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    inputMode="url"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="text">Teks sumber</Label>
                    <span className="text-[11px] text-muted-foreground">
                      {text.trim().length} karakter
                    </span>
                  </div>
                  <Textarea
                    id="text"
                    rows={7}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Tempel transkrip artikel / catatan risetmu di sini…"
                  />
                </div>
              )}

              {/* Preset + durasi */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Preset gaya narasi</Label>
                  <Select value={stylePreset} onValueChange={setStylePreset}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_PRESETS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {
                      STYLE_PRESETS.find((p) => p.id === stylePreset)
                        ?.deskripsi
                    }
                  </p>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Durasi target</Label>
                    <span className="rounded-md border border-gold/25 bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold">
                      {minutes} menit · ±{Math.round(minutes * 140)} kata
                    </span>
                  </div>
                  <div className="flex h-11 items-center px-1">
                    <Slider
                      value={[minutes]}
                      min={5}
                      max={20}
                      step={1}
                      onValueChange={(v) => setMinutes(v[0])}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5 mnt</span>
                    <span>12 mnt</span>
                    <span>20 mnt</span>
                  </div>
                </div>
              </div>

              {/* AI provider */}
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((s) => !s)}
                  className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-gold-soft"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                  {showAdvanced ? "Sembunyikan" : "Lihat"} pengaturan AI (opsional)
                </button>
                {showAdvanced && (
                  <div className="grid gap-2">
                    <Label>Mesin AI</Label>
                    <Select
                      value={provider}
                      onValueChange={(v) => setProvider(v as ProviderChoice)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {
                        PROVIDER_OPTIONS.find((p) => p.value === provider)
                          ?.desc
                      }
                    </p>
                  </div>
                )}
              </div>

              {errorMsg && phase === "form" && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                  {errorMsg}
                </p>
              )}

              <Button size="lg" className="w-full sm:w-fit" onClick={submit} disabled={busy}>
                {busy ? (
                  <>
                    <Wand2 className="h-4 w-4 animate-pulse" /> Menyiapkan…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Mulai Pipeline
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Pipeline berjalan otomatis: Ingest → Naskah → Scene Cards → SEO.
                Hasilnya bisa kamu sunting dulu sebelum di-export.
              </p>
            </CardContent>
          </Card>
        </div>

        <StepsGuide />
      </div>
    </div>
  );
}
