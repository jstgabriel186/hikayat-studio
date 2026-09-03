/**
 * Utilitas ekstraksi JSON dari respons model.
 * Model kadang membungkus output dengan ```json ... ``` atau menulis
 * kalimat pengantar — kita tahan dari kesalahan kecil seperti itu.
 */

export class AiJsonError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "AiJsonError";
  }
}

function stripFences(text: string): string {
  return text.replace(/```(?:json)?/gi, "").trim();
}

export function extractJsonObject<T = unknown>(raw: string): T {
  const text = stripFences(raw);

  // 1) coba parse utuh
  try {
    return JSON.parse(text) as T;
  } catch {
    /* lanjut */
  }

  // 2) cari objek JSON pertama { ... terakhir }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const slice = text.slice(start, end + 1);
    try {
      return JSON.parse(slice) as T;
    } catch (e) {
      throw new AiJsonError(
        "Respons model bukan JSON valid setelah dipotong.",
        raw,
        (e as Error).message,
      );
    }
  }

  // 3) coba array top-level [...]
  const aStart = text.indexOf("[");
  const aEnd = text.lastIndexOf("]");
  if (aStart !== -1 && aEnd > aStart) {
    try {
      return JSON.parse(text.slice(aStart, aEnd + 1)) as T;
    } catch {
      /* lanjut */
    }
  }

  throw new AiJsonError(
    "Respons model tidak mengandung JSON yang valid.",
    raw,
  );
}

/** Uji cepat hasil parse terhadap "bentuk" yang diharapkan (hasil zod juga melakukannya). */
export function looksLikeError(raw: string): boolean {
  const t = raw.toLowerCase();
  return (
    (t.includes("api error") || t.includes("rate limit")) &&
    !t.includes("{")
  );
}
