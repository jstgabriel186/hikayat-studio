/**
 * Preset gaya narasi (dipakai form, pipeline, dan prompt).
 * id tersimpan di Project.stylePreset — jangan ganti id bila ganti label.
 */

export interface StylePreset {
  id: string;
  label: string;
  deskripsi: string;
  /** arahan singkat untuk penulis naskah (disisipkan ke user message) */
  arahanNarasi: string;
  /** arahan visual & palet (disisipkan ke user message scene-card) */
  arahanVisual: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "sinematik-misterius",
    label: "Sinematik Misterius",
    deskripsi: "Suspens, jeda panjang, nada penuh teka-teki.",
    arahanNarasi:
      "Gaya sinematik-misterius: nada waspada, jeda dramatis, simpan informasi kunci selangkah lebih lama.",
    arahanVisual:
      "Palet sinematik gelap dengan bayangan keras, asap tipis, cahaya lampu minyak/torch; suasana misterius dan berlapis.",
  },
  {
    id: "epik-mythos",
    label: "Epik Legenda",
    deskripsi: "Penceritaan rakyat, nada kagum, skala besar.",
    arahanNarasi:
      "Gaya epik-mythos: kosa kata agung, irama bertahap naik seperti legenda yang diceritakan turun-temurun.",
    arahanVisual:
      "Palet warm-golden hour, siluet megah, langit dramatis, komposisi simetris nan megah.",
  },
  {
    id: "dokumenter-tenang",
    label: "Dokumenter Tenang",
    deskripsi: "Analitis, kronologis jelas, kalem dan terpercaya.",
    arahanNarasi:
      "Gaya dokumenter tenang: kalimat jernih, urutan logis, menekankan konteks; tetap hidup tanpa melodrama.",
    arahanVisual:
      "Palet natural lembut (soft daylight, sepia ringan), komposisi bersih, kesan arsip dan jurnalistik.",
  },
  {
    id: "aksi-intens",
    label: "Aksi Intens",
    deskripsi: "Tempo cepat, kalimat patah, energi tinggi.",
    arahanNarasi:
      "Gaya aksi-intens: kalimat pendek dan patah di momen krusial, tempo cepat, dorongan rasa genting yang konstan.",
    arahanVisual:
      "Palet kontras tinggi, gerakan dinamis, asap dan kilat, komposisi miring/dutch-angle, kesan perang.",
  },
];

export function getPreset(id: string): StylePreset {
  return (
    STYLE_PRESETS.find((p) => p.id === id) ?? STYLE_PRESETS[0]
  );
}

export function getPresetLabel(id: string): string {
  return getPreset(id).label;
}
