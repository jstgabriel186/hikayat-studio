"use client";

import * as React from "react";
import {
  Clapperboard,
  ExternalLink,
  ImageIcon,
  Music,
  RefreshCw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/app/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEditor } from "./editor-context";
import { beatMeta, transitionLabel } from "./beat";
import type { SceneC } from "./types";

function Chip({
  children,
  onCopy,
}: {
  children: React.ReactNode;
  onCopy?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-secondary/50 px-2 py-1 text-xs text-foreground/90">
      {children}
      {onCopy && <CopyButton value={onCopy} className="h-5 border-0 px-1" />}
    </span>
  );
}

function SceneCardRow({ scene }: { scene: SceneC }) {
  const { regenScene, busy } = useEditor();
  const meta = beatMeta(scene.beat);
  const regenBusy = busy[`regen-media-${scene.id}`];
  const keywords = scene.brollKeywords;
  const hasMedia = scene.aiImagePrompt.trim().length > 0;

  const pexelsQuery = keywords[0] ?? "";
  const pexelsUrl = pexelsQuery
    ? `https://www.pexels.com/search/${encodeURIComponent(pexelsQuery)}/`
    : null;

  return (
    <Card>
      <CardContent className="px-5 py-4">
        <div className="mb-3 flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              meta.chip,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
            Scene {scene.order} · {meta.label}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {!hasMedia && (
              <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/30">
                belum dibuat
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => regenScene(scene.id, "media")}
              disabled={Boolean(regenBusy)}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", regenBusy && "animate-spin")} />
              Buat ulang
            </Button>
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {/* kolom visual */}
          <div className="flex flex-col gap-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5 text-gold" /> Kunci Visual (b-roll)
            </p>
            {hasMedia ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {keywords.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-secondary/50 px-2 py-1 text-xs">
                    {k}
                    {k === pexelsQuery && pexelsUrl && (
                      <a
                        href={pexelsUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={`Cari "${k}" di Pexels`}
                        className="text-gold hover:text-gold-soft"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}

            <div className="mt-1">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Volume2 className="h-3.5 w-3.5 text-gold" /> SFX
              </p>
              {hasMedia ? (
                <div className="flex flex-wrap gap-1.5">
                  {scene.sfx.map((s) => (
                    <Chip key={s} onCopy={s}>
                      {s}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>

            <div className="mt-1">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Music className="h-3.5 w-3.5 text-gold" /> Mood Musik &amp; Transisi
              </p>
              {hasMedia ? (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="secondary">{scene.musicMood}</Badge>
                  <Badge variant="outline">{transitionLabel(scene.transition)}</Badge>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>

            {scene.archiveSuggestion && (
              <p className="mt-1 flex items-start gap-1.5 rounded-md border border-gold/15 bg-gold/[0.05] px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <span className="mt-0.5 shrink-0">🗂</span>
                <span>
                  <strong className="text-gold-soft">Arsip:</strong>{" "}
                  {scene.archiveSuggestion}
                </span>
              </p>
            )}
          </div>

          {/* kolom prompt AI */}
          <div>
            <p className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-gold" /> Prompt AI Image
              </span>
              {scene.aiImagePrompt && (
                <CopyButton value={scene.aiImagePrompt} label="Salin prompt" className="h-5 px-2" />
              )}
            </p>
            {hasMedia ? (
              <p className="rounded-md border border-border bg-[#100d09]/70 p-3 font-mono text-[11.5px] leading-relaxed text-gold-soft/95">
                {scene.aiImagePrompt}
              </p>
            ) : (
              <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                Prompt belum dibuat.
              </p>
            )}
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground/80">
              Pakai prompt ini di generator gambar (Midjourney / SD / DALL·E) &
amp; kata kunci b-roll untuk mencari stock di Pexels/Pixabay.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SceneCardsTab() {
  const { p, runMediaAll, busy } = useEditor();
  const script = p.script!;
  const scenes = script.scenes;
  const allFilled = scenes.every((s) => s.aiImagePrompt.trim().length > 0);
  const someFilled = scenes.some((s) => s.aiImagePrompt.trim().length > 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-gold" /> Scene Cards — kunci
            visual &amp; audio per adegan
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {allFilled
              ? `${scenes.length} scene sudah punya rencana media. Era & palet dijaga konsisten seluruh video.`
              : someFilled
                ? "Sebagian scene belum punya scene card — isi ulang atau buat per scene."
                : "Belum ada scene card. Satu klik untuk membuat rencana media seluruh scene."}
          </p>
        </CardHeader>
        {!allFilled && (
          <CardContent className="pt-0">
            <Button onClick={() => void runMediaAll()} disabled={Boolean(busy["media"])}>
              {busy["media"] ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Membuat scene cards…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {someFilled ? "Isi ulang semua Scene Card" : "Buat semua Scene Card"}
                </>
              )}
            </Button>
          </CardContent>
        )}
      </Card>

      {scenes.length === 0 && (
        <Card>
          <CardContent className="px-5 py-8 text-center text-sm text-muted-foreground">
            Belum ada scene. Buat naskah dulu.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {scenes.map((s) => (
          <SceneCardRow key={s.id} scene={s} />
        ))}
      </div>
    </div>
  );
}
