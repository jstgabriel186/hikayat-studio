/**
 * Generator SRT sederhana — ditulis sendiri (bukan library) sesuai spec.
 *
 * Aturan timing: subtitle DIBAGI PER SCENE, durasi tiap baris dihitung
 * proporsional terhadap `estimasi_detik` scene (konten naskah kita; video
 * final baru ada setelah editing CapCut — timing dipakai sebagai panduan
 * VO sekaligus "placeholder" rapi di timeline).
 */

export interface NarrationInput {
  order: number;
  narasi: string;
  durasiSec: number; // estimasi_detik
}

export interface SrtCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
  sceneOrder: number;
}

export const MAX_LINE_CHARS = 42; // nyaman dibaca di layar
export const MAX_LINES_PER_CUE = 2;

function tokenize(text: string): string[] {
  return (text ?? "").split(/\s+/).filter(Boolean);
}

/** Format milidetik → "HH:MM:SS,mmm" khas SRT. */
export function srtTimestamp(ms: number): string {
  const totalSec = Math.max(0, ms) / 1000;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const milli = Math.round((ms % 1000) / 1); // presisi ms
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

/**
 * Bangun daftar cue SRT dari daftar scene.
 * Waktu tiap cue proporsional dgn jumlah karakter di dalam scene
 * (timing mengikuti estimasi_detik scene).
 */
export function buildCues(scenes: NarrationInput[], startOffsetMs = 0): SrtCue[] {
  const cues: SrtCue[] = [];
  let clockMs = startOffsetMs;
  let index = 1;

  for (const scene of scenes) {
    const words = tokenize(scene.narasi);
    const secs = Math.max(2, Math.round(scene.durasiSec || 2));
    if (words.length === 0) {
      clockMs += secs * 1000; // scene senyap tetap maju di timeline
      continue;
    }

    // bobot waktu = jumlah karakter (plus spasi)
    const charTotal = words.reduce((a, w) => a + w.length + 1, 0);
    const secPerChar = secs / charTotal;

    const flush = (cueLines: string[]) => {
      if (cueLines.length === 0) return;
      const chars = cueLines.reduce((a, l) => a + l.length, 0);
      const durMs = chars * secPerChar * 1000;
      cues.push({
        index: index++,
        startMs: clockMs,
        endMs: clockMs + durMs,
        text: cueLines.join("\n"),
        sceneOrder: scene.order,
      });
      clockMs += durMs;
    };

    const cueLines: string[] = [];
    for (const word of words) {
      const lastIdx = cueLines.length - 1;
      if (lastIdx < 0) {
        cueLines.push(word);
        continue;
      }
      const cur = cueLines[lastIdx];
      if (cur.length + 1 + word.length <= MAX_LINE_CHARS) {
        cueLines[lastIdx] = cur + " " + word;
        continue;
      }
      // kata tak muat di baris sekarang
      if (cueLines.length >= MAX_LINES_PER_CUE) {
        flush(cueLines);
        cueLines.length = 0;
      }
      cueLines.push(word);
    }
    flush(cueLines);
  }

  return cues;
}

/** Serialisasi cue → teks .srt lengkap. */
export function cuesToSrt(cues: SrtCue[]): string {
  return (
    cues
      .map(
        (c) =>
          `${c.index}\n${srtTimestamp(c.startMs)} --> ${srtTimestamp(
            c.endMs,
          )}\n${c.text}`,
      )
      .join("\n\n") + (cues.length ? "\n" : "")
  );
}

export interface SceneSubtitleGroup {
  sceneOrder: number;
  cues: SrtCue[];
  /** detik mulai & akhir scene utk keperluan chapter/garis waktu */
  startMs: number;
  endMs: number;
}

/** Kelompokkan cue per scene (dipakai preview tab Subtitle & catatan). */
export function groupCuesByScene(cues: SrtCue[]): SceneSubtitleGroup[] {
  const groups = new Map<number, SrtCue[]>();
  for (const c of cues) {
    const arr = groups.get(c.sceneOrder) ?? [];
    arr.push(c);
    groups.set(c.sceneOrder, arr);
  }
  const out: SceneSubtitleGroup[] = [];
  for (const [order, arr] of groups) {
    out.push({
      sceneOrder: order,
      cues: arr,
      startMs: arr[0].startMs,
      endMs: arr[arr.length - 1].endMs,
    });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}
