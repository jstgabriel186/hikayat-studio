import type {
  AiProvider,
  NaskahContext,
  SceneMediaContext,
  SeoContext,
  RegenerateNarrationContext,
  RegenerateMediaContext,
} from "../provider";
import type {
  NaskahOutput,
  SceneMediaOutput,
  SeoPackOutput,
  NaskahScene,
  SceneMedia,
  HookVariant,
} from "../types";
import { getPreset } from "../../presets";
import { slugify } from "../../utils";

/**
 * MockProvider — mode UJI.
 * Menghasilkan output yang VALID (lolos skema zod yang sama dengan provider
 * nyata) TANPA memanggil API / butuh koneksi. Tujuan: seluruh alur
 * (form → pipeline → editor → export ZIP) bisa dicoba end-to-end.
 * Semua teks berlabel [Mode uji] agar tidak tertukar dengan hasil nyata.
 */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function excerpt(transcript: string, offset: number, len = 220): string {
  const t = (transcript ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "(transkrip kosong)";
  const start = (offset * 397) % Math.max(1, t.length - len);
  return t.slice(start, start + len);
}

const TEKNIK_HOOK: Array<[string, string]> = [
  ["scene-drop", "Kota itu sepi. Tidak ada sirene, tidak ada teriakan. Hanya langkah kaki di atas jalan berbatu."],
  ["pertanyaan", "Pernahkah kamu membayangkan bagaimana rasanya hidup di masa ketika berita hanya sampai berhari-hari kemudian?"],
  ["klaim-berani", "Sebuah keputusan kecil yang diambil dalam kegelapan, mengubah arah sejarah ribuan kilometer jauhnya."],
  ["countdown", "Tiga hari. Dua malam. Satu nama. Dan seluruh peta mulai bergeser."],
  ["sudut-pandang-tokoh", "Ia bangun sebelum fajar, menulis surat yang tak akan pernah ia kirim, lalu melangkah keluar."],
  ["kontras", "Di luar, pasar ramai seperti biasa. Di balik dinding itu, sebuah rahasia sedang disiapkan."],
  ["angka", "Satu angka. Tiga belas ribu kilometer. Dan hanya segelintir orang yang tahu artinya."],
  ["misteri", "Tidak ada catatan resmi. Tidak ada saksi. Yang tersisa hanyalah sebuah nama di batu nisan tua."],
  ["kutipan", "\"Jika kita tidak menulis sejarah sendiri, orang lain yang akan menulisnya.\" Siapa yang bicara begitu, dan mengapa kalimat itu nyaris terlupakan?"],
  ["mundur-waktu", "Sebelum ada jalan raya, sebelum ada pelabuhan besar, pulau ini punya rahasia yang berbeda."],
];

const BEAT_NARASI: Record<string, string[]> = {
  setup: [
    "Untuk memahami apa yang terjadi, kita harus mundur beberapa langkah. Wilayah ini bukan sekadar peta — ia adalah persimpangan kepentingan, keyakinan, dan harapan orang-orang biasa.",
    "Konteksnya begini. Pada masa itu, informasi bergerak lambat, tapi desas-desus bergerak lebih cepat dari yang kita kira. Setiap sudut kota menyimpan cerita yang saling sambung.",
    "Sebelum peristiwa itu, kehidupan berjalan seperti biasanya. Nelayan melaut, pedagang membuka kios, anak-anak berangkat ke sekolah yang jauh. Namun di balik rutinitas itu, ada yang sedang bergeser.",
    "Inilah latar belakang yang sering dilupakan buku pelajaran. Bukan hanya nama dan tanggal, tapi keputusan-keputusan kecil yang diambil orang-orang yang tidak pernah tercatat.",
  ],
  konflik: [
    "Ketegangan mulai terasa. Dua kekuatan saling mendekat, dan di tengahnya, rakyat biasa harus memilih. Tidak ada pilihan yang mudah, dan tidak ada jalan mundur.",
    "Di titik ini, semuanya berubah. Yang tadinya bisik-bisik menjadi terang-terangan. Pihak berkuasa merespons, dan setiap respons melahirkan reaksi baru.",
    "Konflik itu tidak meledak dalam sehari. Ia menumpuk perlahan — dari kesalahpahaman kecil, curiga yang dipupuk, sampai akhirnya satu percikan memicu semuanya.",
    "Di sinilah inti ceritanya. Sebuah ultimatum yang dianggap remeh, sebuah janji yang dilanggar, dan sekelompok orang yang merasa tak lagi punya apa pun untuk hilang.",
  ],
  klimaks: [
    "Dan kemudian, semuanya memuncak. Dalam hitungan jam, peta kekuasaan berubah. Yang mustahil kemarin, hari ini menjadi kenyataan.",
    "Inilah momen yang menentukan. Semua jalan cerita — keputusan, keraguan, keberanian — bertemu di satu titik. Tidak ada yang bisa menarik napas lega.",
    "Puncaknya terjadi tanpa peringatan. Sekali perintah diberikan, rantai peristiwa bergerak cepat, dan tak seorang pun bisa menghentikannya.",
    "Di detik-detik terakhir, semuanya bergantung pada satu keputusan. Lambat, mungkin, tapi tegas. Dan sejarah mencatat akibatnya.",
  ],
  refleksi: [
    "Kini, berpuluh tahun kemudian, kita melihat sisa-sisa peristiwa itu di sekitar kita. Yang berubah bukan hanya peta, tapi juga cara orang memandang dirinya sendiri.",
    "Apa yang bisa kita pelajari? Bahwa sejarah jarang ditentukan oleh satu orang besar — melainkan oleh ribuan keputusan kecil yang tak tercatat.",
    "Ketika kita menutup lembaran ini, satu pertanyaan tetap menggantung: apa yang akan kita lakukan bila berada di posisi mereka?",
    "Sejarah tidak pernah benar-benar berakhir. Ia hanya menunggu diceritakan kembali — dengan jujur, dan dari sudut yang belum pernah kita lihat.",
  ],
};

export class MockProvider implements AiProvider {
  readonly meta = {
    id: "mock" as const,
    label: "Mode Uji (tanpa API)",
  };

  describe(): string {
    return "mock";
  }

  private plan(ctx: { targetMinutes: number; transcript: string; stylePresetId: string }) {
    const nScenes = Math.min(
      12,
      Math.max(6, Math.round(ctx.targetMinutes * 1.1)),
    );
    // distribusi beat: hook 1, setup 2-3, konflik, klimaks, refleksi — berurutan
    const plan: Array<{ beat: NaskahScene["beat"]; detik: number }> = [];
    const beats: NaskahScene["beat"][] = ["hook", "setup", "setup", "konflik", "konflik", "klimaks", "klimaks", "refleksi"];
    const detikPerScene = Math.max(12, Math.round((ctx.targetMinutes * 60) / nScenes));
    for (let i = 0; i < nScenes; i++) {
      const b = beats[i % beats.length];
      plan.push({ beat: i === 0 ? "hook" : b, detik: detikPerScene });
    }
    plan[plan.length - 1].beat = "refleksi";
    return plan;
  }

  async buildNaskah(ctx: NaskahContext): Promise<NaskahOutput> {
    const rand = mulberry32(hashString(ctx.transcript + ctx.stylePresetId));
    const preset = getPreset(ctx.stylePresetId);

    const hookVariants: HookVariant[] = TEKNIK_HOOK.map(([teknik, teks]) => ({
      teknik,
      teks,
    }));

    const plan = this.plan(ctx);
    const t = ctx.transcript;
    const scenes: NaskahScene[] = plan.map((p, i) => {
      const pool = p.beat === "hook" ? [] : BEAT_NARASI[p.beat] ?? BEAT_NARASI.setup;
      const kal = pool[Math.floor(rand() * pool.length)] ?? "";
      const kataKunci =
        p.beat === "hook" ? hookVariants[0].teks : kal;
      const narasi =
        p.beat === "hook"
          ? kataKunci
          : `${kal} ${i === 1 ? `[Mode uji] Mulai dari bahan sumber: “…${excerpt(t, i)}…”` : ""}`.trim();

      return {
        beat: p.beat,
        narasi,
        estimasi_detik: p.beat === "hook" ? Math.min(20, p.detik) : p.detik,
        open_loop:
          i > 0 && i < plan.length - 1 && i % 2 === 1
            ? "Apa yang terjadi selanjutnya? Jawabannya mengubah segalanya."
            : null,
        catatan_vo: `[Mode uji] Emosi ${preset.label.toLowerCase()}, tempo mengikuti beat ${p.beat}.`,
      };
    });

    return {
      hook_variants: hookVariants,
      hook_terpilih: hookVariants[0].teks,
      alasan_hook: "[Mode uji] Varian pertama dipilih otomatis oleh mode uji.",
      scenes,
    };
  }

  async buildSceneMedia(ctx: SceneMediaContext): Promise<SceneMediaOutput> {
    const pools = {
      keyword: [
        "old archival photograph",
        "colonial era street",
        "traditional market",
        "harbor with sailing ships",
        "dense tropical forest",
        "map drawing on paper",
        "vintage portrait",
        "rainy village road",
        "old train station",
        "rice fields morning mist",
      ],
      sfx: [
        "distant thunder",
        "crackling fire",
        "footsteps on gravel",
        "typewriter keys",
        "low ambient drone",
        "paper rustling",
        "wind through leaves",
        "distant bell",
        "crowd murmur",
        "heartbeat pulse",
      ],
      music: [
        "dark gamelan drone",
        "solemn strings",
        "tense ambient percussion",
        "melancholic piano",
        "epic orchestral swell",
      ],
    };
    const out: SceneMedia[] = ctx.scenes.map((s, i) => {
      const k0 = pools.keyword[i % pools.keyword.length];
      const k1 = pools.keyword[(i + 3) % pools.keyword.length];
      const k2 = pools.keyword[(i + 7) % pools.keyword.length];
      return {
        order: s.order,
        broll_keywords: [k0, k1, k2],
        sfx: [pools.sfx[i % pools.sfx.length], pools.sfx[(i + 5) % pools.sfx.length]],
        music_mood: pools.music[i % pools.music.length],
        ai_image_prompt: `[Mode uji] ${s.beat} scene — ${k0}, ${k1}, era historical, dramatic lighting, cinematic, film grain, muted sepia tones, 35mm`,
        archive_suggestion:
          i % 3 === 0
            ? "Nationaal Archief — search: “Indonesia”"
            : i % 3 === 1
              ? "Library of Congress — search: “Indonesia 19th century”"
              : null,
        transition: i % 4 === 0 ? "fade" : i % 4 === 1 ? "match-cut" : "cut",
      };
    });
    return { scenes: out };
  }

  async buildSeo(ctx: SeoContext): Promise<SeoPackOutput> {
    const base = slugify(ctx.title, "hikayat");
    const judul = ctx.title || "Hikayat Nusantara";
    const formulas: Array<[string, string]> = [
      ["Kisah yang Tak Pernah Masuk Buku Sekolah — " + judul.slice(0, 20), "curiosity-gap"],
      ["Mengapa " + judul.slice(0, 18) + " Masih Jadi Misteri?", "pertanyaan"],
      ["Fakta yang Jarang Diketahui tentang " + judul.slice(0, 18), "klaim"],
      ["Satu Peristiwa, Seribu Tafsir: " + judul.slice(0, 20), "kontras"],
      ["5 Hal yang Mengejutkan dari " + judul.slice(0, 20), "angka"],
      ["Peristiwa yang Mengubah Peta: " + judul.slice(0, 20), "curiosity-gap"],
      ["Jejak yang Terlupakan — " + judul.slice(0, 22), "misteri"],
      ["Apa yang Sebenarnya Terjadi di " + judul.slice(0, 18) + "?", "pertanyaan"],
      ["Dari Lensa Sejarah: " + judul.slice(0, 22), "kontras"],
      ["Benarkah " + judul.slice(0, 18) + " Seperti yang Kita Dengar?", "klaim"],
    ];
    const dur = ctx.scenes.reduce((a, s) => a + s.durasi, 0);
    const chapters = ctx.scenes.map((s, i) => ({
      mulai: fmtM(dur, ctx.scenes.slice(0, i).reduce((a, x) => a + x.durasi, 0)),
      judul: `[${s.beat}] ${s.narasi.slice(0, 42)}…`,
    }));
    const topik = (judul.match(/\b[a-zA-Z]{4,}\b/g) ?? []).slice(0, 3).join(" ");
    return {
      judul_opsi: formulas.map(([j, l]) => ({
        judul: j.length > 60 ? j.slice(0, 57) + "…" : j,
        label_psikologi: l,
      })),
      judul_terpilih: formulas[0][0].slice(0, 60),
      deskripsi: `[Mode uji] Video sejarah Indonesia tentang ${topik || judul}. Dibuat dengan gaya ${ctx.styleLabel}.\n\nRingkasan narasi mencakup latar, konflik, klimaks, dan refleksi berdasarkan riset dari sumber tertaut.\n\nSumber: ${ctx.sourceUrl ?? "(paste teks)"} — verifikasi mandiri dianjurkan.`,
      chapters,
      hashtag: ["#SejarahIndonesia", "#HikayatNusantara", `#${base}`].slice(0, 3),
      tags: [
        "sejarah indonesia",
        base,
        "dokumenter sejarah",
        "kisah nusantara",
        "video edukasi",
        "fakta sejarah",
        "biografi tokoh",
        "peristiwa bersejarah",
        "sejarah dunia",
        "belajar sejarah",
        "hikayat",
        "indonesia tempo dulu",
      ],
      pinned_comment:
        "[Mode uji] Menurutmu, bagian mana dari kisah ini yang paling jarang dibahas? Tulis di kolom komentar ya.",
      thumbnail: {
        prompt: "[Mode uji] Dramatic Indonesian historical scene, high contrast, subject on left third, cinematic, film grain, muted sepia tones, 35mm — teks di kanan",
        overlay_text: ["RAHASIA", "YANG TAK", "DICERITAKAN", "SEJARAH", "HILANG"],
      },
    };
  }

  async regenerateNarration(
    ctx: RegenerateNarrationContext,
  ): Promise<NaskahScene> {
    return {
      beat: ctx.scene.beat as NaskahScene["beat"],
      narasi: `[Mode uji — tulis ulang] Versi alternatif scene ${ctx.scene.order} (${ctx.scene.beat}). Gaya: ${ctx.styleLabel}. Konteks tetap sejalan dengan scene sebelumnya${ctx.prevNarasi ? `: “…${ctx.prevNarasi.slice(0, 120)}…”` : ""} dan scene berikutnya${ctx.nextNarasi ? `: “…${ctx.nextNarasi.slice(0, 120)}…”` : ""}.`,
      estimasi_detik: 14,
      open_loop: null,
      catatan_vo: "[Mode uji] arahan VO.",
    };
  }

  async regenerateMedia(ctx: RegenerateMediaContext): Promise<SceneMedia> {
    return {
      order: ctx.scene.order,
      broll_keywords: ["old photograph", "historical reenactment", "archival map"],
      sfx: ["camera shutter", "low ambient drone"],
      music_mood: "tense ambient percussion",
      ai_image_prompt: `[Mode uji regen] ${ctx.scene.beat} scene variant, cinematic, film grain, muted sepia tones, 35mm`,
      archive_suggestion: null,
      transition: "cut",
    };
  }

  async translateLines(lines: string[]): Promise<string[]> {
    // Mode uji: salin baris apa adanya supaya alur terlihat berfungsi.
    return lines.map(
      (l) => `[test translation] ${l}`,
    );
  }
}

function fmtM(totalDur: number, elapsed: number): string {
  const m = Math.floor(elapsed / 60);
  const s = Math.round(elapsed % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
