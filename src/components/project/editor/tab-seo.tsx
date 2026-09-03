"use client";

import * as React from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Hash,
  ImageIcon,
  Link2,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Tags,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/app/copy-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEditor } from "./editor-context";
import type { TitleOptionC } from "./types";

export function SeoTab() {
  const { p, runSeo, setSeoTitle, busy } = useEditor();
  const seo = p.seoPack;

  if (!seo) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <TrendingUp className="h-8 w-8 text-gold" />
          <div>
            <p className="font-display text-lg">SEO pack belum dibuat</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Judul, deskripsi, chapters, hashtag, tags, dan thumbnail akan
              disusun dari naskahmu.
            </p>
          </div>
          <Button
            onClick={() => void runSeo()}
            disabled={Boolean(busy["seo"])}
          >
            {busy["seo"] ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Menyusun…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Buat SEO Pack
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const titles: TitleOptionC[] = seo.judul_opsi ?? [];
  const chosen = seo.judul_terpilih;

  const copyDeskripsi = seo.deskripsi;

  return (
    <div className="flex flex-col gap-5">
      {/* Judul */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" /> Opsi Judul (klik = pilih)
          </CardTitle>
          <CardDescription>
            Pilih judul yang bisa kamu pertanggungjawabkan. Maks 60 karakter.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {titles.map((t, i) => {
            const active = chosen === t.judul;
            return (
              <button
                key={i}
                type="button"
                onClick={() => !active && setSeoTitle(t.judul)}
                className={cn(
                  "group flex items-start gap-2 rounded-lg border p-3 text-left transition-all cursor-pointer",
                  active
                    ? "border-gold/60 bg-gold/[0.08]"
                    : "border-border bg-card/60 hover:border-gold/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      active ? "text-gold-soft" : "text-foreground/90",
                    )}
                  >
                    {t.judul}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t.label_psikologi.replace(/-/g, " ")}
                    {chosen === t.judul && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                        <Check className="h-3 w-3" /> terpilih
                      </span>
                    )}
                  </p>
                </div>
                <CopyButton
                  value={t.judul}
                  label=""
                  className="h-6 px-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Deskripsi + chapters */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Copy className="h-4 w-4 text-gold" /> Deskripsi
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-end gap-2">
              <CopyButton value={copyDeskripsi} label="Salin deskripsi" />
            </div>
            <p className="whitespace-pre-wrap rounded-md border border-border bg-[#100d09]/60 p-3 font-mono text-[11.5px] leading-relaxed text-foreground/85">
              {copyDeskripsi}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ChevronRight className="h-4 w-4 text-gold" /> Chapters
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {(seo.chapters ?? []).map((c) => (
              <div
                key={c.mulai + c.judul}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-card/50 px-2.5 py-1.5 text-xs"
              >
                <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-gold">
                  {c.mulai}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {c.judul}
                </span>
                <CopyButton
                  value={`${c.mulai} ${c.judul}`}
                  label=""
                  className="h-5 px-1.5"
                />
              </div>
            ))}
            {!seo.chapters?.length && (
              <p className="text-xs text-muted-foreground">Belum ada chapters.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hashtag + tags */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4 text-gold" /> Hashtag
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-1.5">
            {(seo.hashtag ?? []).map((h) => (
              <span key={h} className="inline-flex items-center gap-1 rounded-md bg-gold/10 px-2 py-1 text-sm text-gold-soft">
                {h}
              </span>
            ))}
            <CopyButton
              value={(seo.hashtag ?? []).join(" ")}
              label="Salin semua"
              className="ml-auto"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="h-4 w-4 text-gold" /> Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {(seo.tags ?? []).map((t) => (
              <span key={t} className="rounded-md border border-border bg-secondary/60 px-2 py-1 text-[11px] text-muted-foreground">
                {t}
              </span>
            ))}
            <CopyButton
              value={(seo.tags ?? []).join(", ")}
              label="Salin semua"
              className="ml-auto"
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Pinned + thumbnail */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="h-4 w-4 text-gold" /> Komentar Semat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="rounded-md border border-border bg-[#100d09]/60 p-3 text-sm leading-relaxed text-foreground/85">
              {seo.pinned_comment}
            </p>
            <div className="flex justify-end">
              <CopyButton value={seo.pinned_comment} label="Salin" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4 text-gold" /> Thumbnail
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Prompt AI image
              </p>
              <CopyButton value={seo.thumbnail?.prompt ?? ""} label="Salin prompt" />
            </div>
            <p className="rounded-md border border-border bg-[#100d09]/60 p-3 font-mono text-[11.5px] leading-relaxed text-gold-soft/90">
              {seo.thumbnail?.prompt}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Opsi teks overlay (maks 4 kata)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(seo.thumbnail?.overlay_text ?? []).map((o) => (
                <span
                  key={o}
                  className="inline-flex items-center gap-1 rounded-md border border-gold/25 bg-gold/[0.06] px-2 py-1 font-display text-sm text-gold-soft"
                >
                  {o}
                  <CopyButton value={o} label="" className="h-5 border-0 px-1" />
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" /> Judul terpilih ikut dipakai di berkas
        05-SEO-PACK.txt saat export ZIP.
      </p>
    </div>
  );
}
