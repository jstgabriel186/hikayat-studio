import { YoutubeTranscript } from "youtube-transcript";
import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import type { TranscriptResult } from "./ai/types";

const execFileP = promisify(execFile);

/**
 * Tahap [A] INGEST — materi mentah:
 *   1) URL YouTube  → unduh subtitle resmi (youtube-transcript)
 *   2) tanpa subtitle → yt-dlp unduh audio → OpenAI Whisper (whisper-1)
 *   3) paste teks   → dipakai langsung (tanpa jaringan)
 * Metadata video (judul & pengarang) diambil lewat oEmbed.
 */

export function isYoutubeUrl(input: string): boolean {
  const u = (input ?? "").trim().toLowerCase();
  return (
    /youtube\.com\/watch/.test(u) ||
    /youtu\.be\//.test(u) ||
    /youtube\.com\/shorts\//.test(u) ||
    /youtube\.com\/embed\//.test(u)
  );
}

export function extractYoutubeVideoId(input: string): string | null {
  const m = input.trim().match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

interface OembedMeta {
  title?: string;
  author_name?: string;
  author_url?: string;
}

export async function fetchYoutubeMetadata(videoId: string): Promise<{
  videoTitle: string | null;
  videoAuthor: string | null;
}> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return { videoTitle: null, videoAuthor: null };
    const data = (await res.json()) as OembedMeta;
    return {
      videoTitle: data.title ?? null,
      videoAuthor: data.author_name ?? null,
    };
  } catch {
    return { videoTitle: null, videoAuthor: null };
  }
}

async function fetchYoutubeTranscriptText(videoId: string): Promise<{
  text: string;
  sourceLang: string | null;
}> {
  const segs = await YoutubeTranscript.fetchTranscript(videoId);
  const text = segs.map((s) => s.text.trim()).filter(Boolean).join(" ");
  const lang = (segs.find((s) => (s as { lang?: string }).lang) as { lang?: string } | undefined)?.lang ?? null;
  return { text, sourceLang: lang };
}

async function downloadYoutubeAudio(
  videoId: string,
  outDir: string,
): Promise<string> {
  const outBase = path.join(outDir, videoId);
  await execFileP("yt-dlp", [
    "-f",
    "bestaudio/best",
    "-x",
    "--audio-format",
    "mp3",
    "-o",
    `${outBase}.%(ext)s`,
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);
  // cari berkas hasil
  const files = await fs.readdir(outDir);
  const f = files.find((x) => x.startsWith(videoId));
  if (!f) throw new Error("yt-dlp selesai tanpa menghasilkan berkas audio.");
  return path.join(outDir, f);
}

/** Transkripsi audio via OpenAI Whisper (whisper-1) — multipart fetch. */
export async function transcribeWithOpenAIWhisper(
  audioPath: string,
  apiKey: string,
  model: string,
): Promise<{ text: string; method: "whisper" }> {
  const buf = await fs.readFile(audioPath);
  const form = new FormData();
  form.append("file", new Blob([buf]), path.basename(audioPath));
  form.append("model", model);
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper gagal (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = (await res.json()) as { text?: string };
  return { text: data.text ?? "", method: "whisper" };
}

/**
 * Ingest dari URL YouTube. Mengembalikan transkrip + metadata.
 * Throws Error berbahasa Indonesia dengan arahan yang jelas.
 */
export async function ingestYoutubeUrl(
  videoUrl: string,
  opts: { storageDir: string; openaiApiKey?: string; whisperModel?: string } = {
    storageDir: path.join(process.cwd(), "storage", "audio"),
  },
): Promise<TranscriptResult> {
  const videoId = extractYoutubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error(
      "Tidak bisa mengenali link YouTube. Pastikan format: youtube.com/watch?v=…, youtu.be/…, atau youtube.com/shorts/…",
    );
  }

  // 1) metadata
  const meta = await fetchYoutubeMetadata(videoId);

  // 2) subtitle resmi
  try {
    const { text, sourceLang } = await fetchYoutubeTranscriptText(videoId);
    if (!text.trim()) throw new Error("Subtitle kosong.");
    return {
      transcript: text,
      sourceLang: sourceLang ?? "youtube",
      videoTitle: meta.videoTitle,
      videoAuthor: meta.videoAuthor,
      method: "youtube-subtitle",
      note: "Subtitle resmi video berhasil diambil.",
    };
  } catch (e) {
    const firstErr = e instanceof Error ? e.message : String(e);
    // 3) fallback: unduh audio + Whisper
    if (!opts.openaiApiKey) {
      throw new Error(
        `Video ini tidak punya subtitle yang bisa diambil (${firstErr}). Fallback Whisper butuh OPENAI_API_KEY dan yt-dlp+ffmpeg terpasang.`,
      );
    }
    try {
      const audioPath = await downloadYoutubeAudio(videoId, opts.storageDir);
      const { text } = await transcribeWithOpenAIWhisper(
        audioPath,
        opts.openaiApiKey,
        opts.whisperModel ?? "whisper-1",
      );
      return {
        transcript: text,
        sourceLang: null,
        videoTitle: meta.videoTitle,
        videoAuthor: meta.videoAuthor,
        method: "whisper",
        audioUrl: audioPath,
        note: "Tidak ada subtitle resmi — memakai Whisper.",
      };
    } catch (e2) {
      throw new Error(
        `Subtitle tidak tersedia (${firstErr}). Percobaan Whisper juga gagal: ${
          e2 instanceof Error ? e2.message : e2
        }. Pastikan yt-dlp & ffmpeg terpasang, OPENAI_API_KEY valid, dan audionya tidak ber-DRM.`,
      );
    }
  }
}

/** Pastikan folder storage ada. */
export async function ensureStorage(storageDir?: string): Promise<string> {
  const dir =
    storageDir ?? path.join(process.cwd(), "storage", "audio");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
