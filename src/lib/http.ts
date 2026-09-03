import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function err(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

/** Ambil field provider/model dari body request secara aman. */
export function pickAiRequest(body: Record<string, unknown> | null): {
  provider?: "anthropic" | "mock" | "auto" | null;
  model?: string | null;
} {
  const provider = body?.provider as
    | "anthropic"
    | "mock"
    | "auto"
    | null
    | undefined;
  const model =
    typeof body?.model === "string" && body.model.trim()
      ? body.model.trim()
      : null;
  return {
    provider: provider && ["anthropic", "mock", "auto"].includes(provider)
      ? provider
      : "auto",
    model,
  };
}

export function jsonErrorToMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Terjadi kesalahan tak dikenal.";
}
