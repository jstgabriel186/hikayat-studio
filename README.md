# 🪶 Hikayat Studio

**Ubah video YouTube asing menjadi paket produksi video sejarah Indonesia yang siap diedit di CapCut.**

Hikayat Studio *tidak membuat* video. Ia menyiapkan **semua bahan**:
transkrip diambil → ditulis ulang sebagai **naskah voiceover Indonesia yang orisinal** → tiap adegan diberi **scene card** (keywords b-roll, SFX, mood musik, prompt AI image, saran arsip) → **SEO pack** (judul, deskripsi, chapters, hashtag, tags, thumbnail) → **subtitle SRT** → semuanya diexport sebagai **satu ZIP**. Editing dan perakitan tetap di CapCut.

---

## ✨ Fitur (MVP — Phase 1)

| Halaman | Isi |
|---|---|
| `/` | Dashboard daftar proyek (status, kemajuan pipeline, gaya, durasi) |
| `/project/new` | Input **link YouTube** ATAU **paste teks artikel**; pilih preset gaya; slider durasi 5–20 menit; jalankan pipeline **Ingest → Naskah → Scene Cards → SEO** dengan timeline progres |
| `/project/[id]` | Editor 5 tab: **Naskah** (10 varian hook pilihan + scene editable + tulis ulang per scene), **Scene Cards** (keywords/SFX/musik/prompt + copy + regenerate per scene), **SEO** (klik = pilih judul), **Subtitle** (preview SRT + unduh `.srt` ID & EN), **Export** (checklist + ZIP 1-klik) |

Setiap field output punya tombol **Salin** — kebutuhan utama one-person studio.
Antarmuka berbahasa Indonesia, tema gelap *arsip sejarah* (emas `#C9A227`, kertas `#EDE6D6`).

## 💸 Seratus persen gratis

Aplikasi berjalan **tanpa biaya sedikit pun**:

1. **Transcript YouTube** — gratis via subtitle resmi video.
2. **AI sungguhan tanpa modal** — pasang kunci **Gemini gratis** (Google AI Studio, tanpa kartu kredit):
   - Buka <https://aistudio.google.com/apikey> → *Create API key* (gratis).
   - Isi `GEMINI_API_KEY` di `.env.local` → aplikasi otomatis memakai `gemini-2.5-flash` (free tier).
3. **Tanpa kunci apa pun?** Aplikasi otomatis turun ke **Mode Uji** (output contoh, tanpa jaringan) — seluruh alur tetap bisa dicoba. Pil status di pojok editor memberi tahu mode aktif.
4. Anthropic (`claude-sonnet-4-5`) & Whisper hanya **opsional** bagi yang punya kunci berbayar.

## 🚀 Menjalankan lokal (cara paling disarankan)

```bash
npm install
cp .env.example .env        # database SQLite
cp .env.example .env.local  # isi GEMINI_API_KEY bila mau AI sungguhan
npm run db:push             # buat database lokal
npm run dev                 # buka http://localhost:3000
```

Panduan cepat setelah jalan: **Proyek Baru → tempel link YouTube (atau teks) → Mulai Pipeline → sunting → Export ZIP**.

## 🔌 Variabel lingkungan

| Variabel | Wajib? | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | `file:./dev.db` (SQLite). Postgres: `postgresql://…` + ganti provider di schema |
| `GEMINI_API_KEY` | Opsional | Kunci **gratis** Google AI Studio → AI sungguhan |
| `GEMINI_MODEL` | Opsional | Default `gemini-2.5-flash` |
| `ANTHROPIC_API_KEY` | Opsional | Claude (berbayar), per spesifikasi produk |
| `OPENAI_API_KEY` | Opsional | Fallback Whisper utk video tanpa subtitle |
| `AI_PROVIDER` | Opsional | `auto` (default) · `gemini` · `anthropic` · `mock` |

Tidak ada kunci yang ditulis di kode. Semua lewat `.env` / `.env.local` (lihat `.env.example`).

## 🗂 Struktur penting

```
hikayat-studio/
├── prompts/                 ← SYSTEM PROMPT AI (markdown, bisa diedit user biasa)
│   ├── naskah-engine.md       [B] naskah VO orisinal
│   ├── scene-card.md          [C] rencana visual & audio per adegan
│   └── seo-pack.md            [D] SEO lengkap YouTube
├── prisma/schema.prisma     ← data model (SQLite; kompatibel PostgreSQL)
├── src/lib/
│   ├── ai/provider.ts         abstraction AI (tukar provider tanpa sentuh pipeline)
│   ├── ai/providers/          anthropic.ts · gemini.ts · mock.ts
│   ├── ai/schemas.ts          skema zod utk semua output LLM
│   ├── transcript.ts          ingest YouTube subtitle → fallback Whisper
│   ├── pipeline.ts            tahap B→C→D (idempotent)
│   ├── srt.ts                 generator SRT (ditulis sendiri)
│   └── export.ts              perakit ZIP (7 berkas)
├── src/app/api/…             REST: projects, stages, regenerate, subtitle EN, export
└── src/components/…          UI (Tailwind + shadcn-style, tema gelap arsip)
```

### Isi ZIP export

```
hikayat-{slug}/
├── 00-NASKAH.md          hook + semua scene + catatan VO & open loop
├── 01-subtitle-id.srt    subtitle Indonesia
├── 02-subtitle-en.srt    terjemahan Inggris
├── 03-cue-sheet.csv      scene, durasi, keywords, SFX, musik, transisi
├── 04-prompts-gambar.txt semua prompt AI image (bernomor scene)
├── 05-SEO-PACK.txt       judul terpilih + opsi, deskripsi, chapters, hashtag, tags, thumbnail
└── scenes.json           data mentah (utk pengembangan Phase 2)
```

## 📚 Roadmap (belum diimplementasikan)

- **Phase 2** — Voiceover ElevenLabs (auto-SSML dari `catatan_vo`), auto-search stock Pexels, fact-check engine, originality score.
- **Phase 3** — Style DNA lock, AI image generation, repurposing Shorts, kalender sejarah Indonesia, import CSV YouTube Studio, prompt versioning di `prompts/versions/`.

Struktur folder & skema DB sudah dirancang agar mudah diperluas ke sana (mis. model `Asset`, interface provider, loader prompt).

---

## 🌐 GitHub & akses dari mana saja

### 1. Push ke GitHub (kode aman di cloud + riwayat commit)

Repo ini sudah bersih (tidak ada kunci/`.env`/database ter-commit). Untuk push ke repo milikmu:

1. Buat repo baru di GitHub: <https://github.com/new> → nama mis. `hikayat-studio` → **jangan centang** "Add a README" (sudah ada).
2. Di terminal proyek:

```bash
git remote add origin https://github.com/USERNAME/hikayat-studio.git
git branch -M main
git push -u origin main
```

*(Ganti `USERNAME`. GitHub akan minta autentikasi — pakai *Personal Access Token* bila perlu: GitHub → Settings → Developer settings → Tokens → `repo` scope.)*

### 2. "Website tinggal pakai" — pilihan gratis

**Paling sederhana (disarankan): jalankan di komputermu.**
```bash
npm run dev          # buka di http://localhost:3000
npm run dev -- -H 0.0.0.0   # biar bisa diakses perangkat lain di jaringanmu
```
Mau akses dari luar tanpa deploy? Pasang [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) gratis:
```bash
cloudflared tunnel --url http://localhost:3000
```
→ dapat URL publik `https://xxx.trycloudflare.com` yang bisa dibuka siapa saja.
(Butuh komputermu tetap menyala.)

### ⭐ Cara "website tinggal pakai" — gratis, rekomendasi utama

Deploy ke **Render.com** (server Node selalu jalan, tanpa batas waktu per-permintaan — cocok utk panggilan AI 30–90 dtk) + **Neon** (PostgreSQL gratis, data tersimpan permanen). Total ±15 menit, mayoritas tinggal klik. Semua berkas sudah siap di repo (`render.yaml`, `prisma/schema.pg.prisma`, `/api/health`).

1. **Neon** — buat DB gratis: <https://neon.tech> → *New project* (region Singapore) → salin **connection string** `postgresql://…?sslmode=require`.
2. **Gemini** — kunci gratis: <https://aistudio.google.com/apikey>.
3. **Render** — daftar di <https://render.com> (tanpa kartu untuk free) → **New + Web Service** → **Build and deploy from a Git repository** → pilih `jstgabriel186/hikayat-studio`.
   - Render membaca `render.yaml` otomatis (node 20, build + db push + start).
   - Di tab **Environment**, tambahkan:
     - `DATABASE_URL` = connection string Neon
     - `GEMINI_API_KEY` = kunci Gemini
   - Klik **Apply / Deploy**. Tunggu beberapa menit → buka URL `https://hikayat-studio.onrender.com`.
4. Selesai — buka website, buat proyek, pakai. Free tier Render "tidur" setelah ±15 menit nganggur; kunjungan pertama bangun lagi (±10–50 dtk) — wajar utk free.

> Catatan deploy: `render.yaml` menyalin `schema.pg.prisma` (provider PostgreSQL) ke `schema.prisma` saat build — model identik dgn versi SQLite lokal, jadi perubahan skema cukup dilakukan di `schema.prisma` lalu salin ke `schema.pg.prisma`. Penyedia serverless (Vercel Hobby) bisa dipakai juga, tetapi batas durasi function ~60 dtk berisiko utk tahap AI panjang.

---

Dibangun dengan **Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui · Prisma · Anthropic SDK · youtube-transcript · JSZip**. Model AI: `claude-sonnet-4-5` (opsional) dan `gemini-2.5-flash` (gratis).
