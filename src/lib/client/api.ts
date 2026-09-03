"use client";

/** Wrapper fetch ringan utk API internal. Membuang error berbahasa Indonesia. */

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? `Terjadi kesalahan (${res.status}).`;
  } catch {
    return `Terjadi kesalahan (${res.status}).`;
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export async function postJson<T>(
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export async function patchJson<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export async function postText(path: string): Promise<string> {
  const res = await fetch(path, { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.text();
}
