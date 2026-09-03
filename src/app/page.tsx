import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  FileText,
  Film,
  Link2,
  Plus,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { statusMeta, stageProgress, PIPELINE_STEPS } from "@/lib/status";
import { getPresetLabel } from "@/lib/presets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

async function getProjects() {
  return prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      stylePreset: true,
      targetMinutes: true,
      sourceUrl: true,
      sourceType: true,
      createdAt: true,
      updatedAt: true,
      script: { select: { id: true } },
    },
  });
}

function PipelineMini({ status }: { status: string }) {
  const done = stageProgress(status);
  return (
    <div className="flex items-center gap-1.5" title="Kemajuan pipeline">
      {PIPELINE_STEPS.map((s, i) => (
        <span
          key={s.id}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i < done
              ? "bg-gold"
              : i === done && status !== "draft"
                ? "bg-gold/50 animate-hikayat-pulse"
                : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="relative overflow-hidden bg-noise">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
          <ScrollText className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-2xl text-balance">
          Mulai dari satu video, dapatkan seluruh paket produksi
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Hikayat Studio mengambil transkrip video YouTube (atau teks yang kamu
          tempel), lalu menyiapkan <em>semua</em> bahannya: naskah voiceover
          Indonesia yang orisinal, scene cards berisi keywords b-roll &amp; SFX,
          SEO pack, hingga subtitle SRT. Editing video tetap di CapCut — kamu
          tinggal merakit.
        </p>

        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          {["Ingest transkrip", "Naskah orisinal", "Scene Cards", "SEO Pack", "ZIP Export"].map(
            (s) => (
              <span
                key={s}
                className="rounded-full border border-border px-2.5 py-1 text-[11px]"
              >
                {s}
              </span>
            ),
          )}
        </div>

        <Button asChild size="lg" className="mt-8">
          <Link href="/project/new">
            <Plus className="h-4 w-4" /> Buat Proyek Pertama
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="relative mb-10">
        <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-gold/10 blur-[100px]" />
        <p className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.3em] text-gold-faint">
          <Sparkles className="h-3.5 w-3.5" /> One-person studio · sejarah
          Indonesia
        </p>
        <h1 className="max-w-3xl font-display text-4xl leading-[1.12] text-balance sm:text-5xl">
          Riset jadi <span className="text-gold">naskah</span>, naskah jadi{" "}
          <span className="text-gold">paket produksi</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Satu paste link — Hikayat Studio menyiapkan seluruh bahan untuk video
          YouTube sejarahmu: dari naskah voiceover, kunci visual &amp; suara per
          adegan, sampai SEO dan subtitle. Bukan terjemahan, tapi cerita
          Indonesia yang orisinal.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/project/new">
            <Plus className="h-4 w-4" /> Proyek Baru
          </Link>
        </Button>
      </section>

      {/* Daftar proyek */}
      <section className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Proyek</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {projects.length === 0
              ? "Belum ada proyek."
              : `${projects.length} proyek — terakhir diperbarui ${fmtDateTime(
                  projects[0].updatedAt,
                )}`}
          </p>
        </div>
      </section>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const meta = statusMeta(p.status);
            return (
              <Link key={p.id} href={`/project/${p.id}`} className="group">
                <Card className="archival-card h-full transition-all duration-200 group-hover:border-gold/45 group-hover:shadow-[0_18px_50px_-28px_rgba(201,162,39,.55)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {p.script && <FileText className="h-4 w-4 text-gold/70" />}
                    </div>
                    <CardTitle className="mt-2 leading-snug group-hover:text-gold-soft">
                      {p.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {meta.blurb}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <PipelineMini status={p.status} />
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Film className="h-3.5 w-3.5" />
                        {getPresetLabel(p.stylePreset)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {p.targetMinutes} mnt
                      </span>
                      {p.sourceUrl ? (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Link2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{p.sourceUrl}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <ScrollText className="h-3.5 w-3.5" />
                          Teks tempel
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span>Dibuat {fmtDate(p.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 text-gold opacity-0 transition-opacity group-hover:opacity-100">
                      Buka <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
