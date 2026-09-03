"use client";

import * as React from "react";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { cn, fmtClock } from "@/lib/utils";
import { CopyButton } from "@/components/app/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEditor } from "./editor-context";
import { beatMeta } from "./beat";
import type { SceneC } from "./types";

function HookSection() {
  const { p, setHook, busy } = useEditor();
  const script = p.script;
  if (!script) return null;
  const variants = script.hookVariants;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" /> Hook — 10 varian pembuka
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pilih yang paling kuat. Klik untuk menjadikannya hook aktif (bisa
          diganti kapan saja). Varian lain tersimpan sebagai cadangan.
        </p>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {variants.map((v, i) => {
          const active = v.teks === script.hookVariant;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !active && setHook(v.teks)}
              className={cn(
                "group relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all cursor-pointer",
                active
                  ? "border-gold/60 bg-gold/[0.08] shadow-[0_0_20px_-10px_rgba(201,162,39,.9)]"
                  : "border-border bg-card/60 hover:border-gold/30 hover:bg-gold/[0.03]",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {v.teknik.replace(/-/g, " ")}
                </span>
                {active ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gold">
                    <Check className="h-3.5 w-3.5" /> Aktif
                  </span>
                ) : (
                  <span className="text-[11px] opacity-0 transition-opacity group-hover:opacity-60 text-gold-soft">
                    Pakai →
                  </span>
                )}
              </div>
              <p className={cn("text-sm leading-snug", active ? "text-gold-soft" : "text-foreground/90")}>
                {v.teks}
              </p>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SceneSummaryBar() {
  const { p } = useEditor();
  const script = p.script;
  if (!script) return null;
  const targetSec = p.targetMinutes * 60;
  const pct = Math.min(100, Math.round((script.totalDurationSec / targetSec) * 100));
  const wordsPct = Math.min(
    100,
    Math.round((script.totalWords / script.targetWords) * 100),
  );
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Estimasi durasi
            </p>
            <p className="font-display text-xl text-gold">
              {fmtClock(script.totalDurationSec)}
              <span className="ml-1 text-xs text-muted-foreground">
                / target {p.targetMinutes} mnt ({pct}%)
              </span>
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Jumlah kata
            </p>
            <p className="font-display text-xl">
              {script.totalWords}
              <span className="ml-1 text-xs text-muted-foreground">
                / ±{script.targetWords} kata ({wordsPct}%)
              </span>
            </p>
          </div>
        </div>
        <div className="h-1.5 min-w-40 flex-1 rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct > 115 ? "bg-ember" : "bg-gold",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SceneCardEditor({ scene }: { scene: SceneC }) {
  const { patchScene, regenScene, busy } = useEditor();
  const [narasi, setNarasi] = React.useState(scene.narration);
  const [dur, setDur] = React.useState(String(scene.durationSec));
  const meta = beatMeta(scene.beat);
  const regenBusy = busy[`regen-narration-${scene.id}`];
  const saveBusy = busy[`scene-${scene.id}`];

  React.useEffect(() => {
    setNarasi(scene.narration);
    setDur(String(scene.durationSec));
  }, [scene.narration, scene.durationSec]);

  const onBlurNarasi = () => {
    const t = narasi.trim();
    if (t && t !== scene.narration) {
      void patchScene(scene.id, { narration: t });
    }
  };
  const onBlurDur = () => {
    const n = parseInt(dur, 10);
    if (!Number.isNaN(n) && n !== scene.durationSec) {
      void patchScene(scene.id, { durationSec: Math.min(600, Math.max(4, n)) });
    } else {
      setDur(String(scene.durationSec));
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border/50 bg-card/60 px-5 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
            meta.chip,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
          {scene.order}. {meta.label}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            ±
            <Input
              value={dur}
              onChange={(e) => setDur(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={onBlurDur}
              className="h-7 w-16 px-2 text-center text-xs"
              inputMode="numeric"
              disabled={Boolean(saveBusy)}
            />
            dtk
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => regenScene(scene.id, "narration")}
            disabled={Boolean(regenBusy)}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", regenBusy && "animate-spin")} />
            Tulis ulang
          </Button>
        </div>
      </div>

      <CardContent className="flex flex-col gap-3 px-5 py-4">
        <textarea
          value={narasi}
          onChange={(e) => setNarasi(e.target.value)}
          onBlur={onBlurNarasi}
          rows={Math.min(6, Math.max(2, Math.ceil(narasi.length / 120)))}
          className="w-full resize-y rounded-md border border-transparent bg-transparent text-[15px] leading-relaxed text-foreground outline-none transition-colors focus:border-gold/40 focus:bg-[#100d09]/70 focus:px-3 focus:py-2"
          placeholder="Tulis narasi scene… (otomatis tersimpan saat selesai mengetik)"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {scene.openLoop && (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-gold-soft/90">
                🔒 Open loop: {scene.openLoop}
              </span>
            )}
            {scene.voNote && <span className="italic">Catatan VO: {scene.voNote}</span>}
          </div>
          {saveBusy ? (
            <Badge variant="outline" className="text-[10px]">
              Menyimpan…
            </Badge>
          ) : (
            narasi !== scene.narration && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
                Belum disimpan
              </Badge>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function NaskahTab() {
  const { p } = useEditor();
  const script = p.script;

  if (!script) return null;

  return (
    <div className="flex flex-col gap-5">
      <HookSection />
      <SceneSummaryBar />
      {script.scenes.length === 0 && (
        <Card>
          <CardContent className="px-5 py-8 text-center text-sm text-muted-foreground">
            Scene kosong — jalankan ulang tahap Naskah lewat banner Pipeline di
            atas.
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col gap-4">
        {script.scenes.map((s) => (
          <SceneCardEditor key={s.id} scene={s} />
        ))}
      </div>
    </div>
  );
}
