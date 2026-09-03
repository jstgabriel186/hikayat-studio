"use client";

import * as React from "react";
import { toast } from "sonner";
import { getJson, patchJson, postJson } from "@/lib/client/api";
import type { ProjectDetailC } from "./types";

/**
 * Context editor: menyimpan state proyek + aksi API dengan konvensi
 * bahwa hampir semua endpoint mengembalikan detail penuh → cukup apply().
 */

export type BusyMap = Record<string, boolean>;

interface EditorContextValue {
  p: ProjectDetailC;
  apply: (next: ProjectDetailC) => void;
  refresh: () => Promise<void>;
  setKeyBusy: (key: string, val: boolean) => void;
  busy: BusyMap;
  // aksi
  rename: (title: string) => Promise<void>;
  runIngest: () => Promise<void>;
  runScript: () => Promise<void>;
  runMediaAll: () => Promise<void>;
  runSeo: () => Promise<void>;
  setHook: (teks: string) => Promise<void>;
  patchScene: (
    sceneId: string,
    body: Record<string, unknown>,
  ) => Promise<void>;
  regenScene: (sceneId: string, kind: "narration" | "media") => Promise<void>;
  setSeoTitle: (judul: string) => Promise<void>;
}

const EditorContext = React.createContext<EditorContextValue | null>(null);

export function EditorProvider({
  projectId,
  initial,
  children,
}: {
  projectId: string;
  initial: ProjectDetailC;
  children: React.ReactNode;
}) {
  const [p, setP] = React.useState<ProjectDetailC>(initial);
  const [busy, setBusy] = React.useState<BusyMap>({});

  const setKeyBusy = (key: string, val: boolean) =>
    setBusy((b) => ({ ...b, [key]: val }));

  const apply = React.useCallback((next: ProjectDetailC) => setP(next), []);

  const refresh = React.useCallback(async () => {
    try {
      const d = await getJson<ProjectDetailC>(`/api/projects/${projectId}`);
      setP(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat ulang.");
    }
  }, [projectId]);

  const wrap = async (
    key: string,
    fn: () => Promise<ProjectDetailC>,
    successMsg?: string,
  ) => {
    if (busy[key]) return;
    setKeyBusy(key, true);
    try {
      const d = await fn();
      setP(d);
      if (successMsg) toast.success(successMsg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setKeyBusy(key, false);
    }
  };

  const value: EditorContextValue = {
    p,
    apply,
    refresh,
    setKeyBusy,
    busy,
    rename: (title) =>
      wrap("rename", () =>
        patchJson<ProjectDetailC>(`/api/projects/${projectId}`, { title }),
      ),
    runIngest: () =>
      wrap("ingest", async () => {
        if (!p.sourceUrl) throw new Error("Belum ada link sumber.");
        return postJson<ProjectDetailC>(`/api/projects/${projectId}/ingest`, {
          sourceUrl: p.sourceUrl,
        });
      }),
    runScript: () =>
      wrap("script", () =>
        postJson<ProjectDetailC>(`/api/projects/${projectId}/script`, {}),
      ),
    runMediaAll: () =>
      wrap("media", () =>
        postJson<ProjectDetailC>(`/api/projects/${projectId}/media`, {}),
      ),
    runSeo: () =>
      wrap("seo", () =>
        postJson<ProjectDetailC>(`/api/projects/${projectId}/seo`, {}),
      ),
    setHook: (teks) =>
      wrap("hook", () =>
        patchJson<ProjectDetailC>(`/api/projects/${projectId}/script`, {
          hookVariant: teks,
        }),
      ),
    patchScene: (sceneId, body) =>
      wrap(`scene-${sceneId}`, () =>
        patchJson<ProjectDetailC>(
          `/api/projects/${projectId}/scenes/${sceneId}`,
          body,
        ),
      ),
    regenScene: (sceneId, kind) =>
      wrap(`regen-${kind}-${sceneId}`, () =>
        postJson<ProjectDetailC>(
          `/api/projects/${projectId}/scenes/${sceneId}/regenerate`,
          { kind },
        ),
      ),
    setSeoTitle: (judul) =>
      wrap("seotitle", () =>
        patchJson<ProjectDetailC>(`/api/projects/${projectId}/seo`, {
          judul_terpilih: judul,
        }),
      ),
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const v = React.useContext(EditorContext);
  if (!v) throw new Error("useEditor harus dipakai di dalam EditorProvider.");
  return v;
}
