import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { refreshDetail } from "@/lib/pipeline";
import { ProjectEditor } from "@/components/project/editor/editor-shell";
import type { ProjectDetailC } from "@/components/project/editor/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const d = (await refreshDetail(id)) as unknown as ProjectDetailC;
    return { title: d.title };
  } catch {
    return { title: "Proyek" };
  }
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let detail: ProjectDetailC;
  try {
    detail = (await refreshDetail(id)) as unknown as ProjectDetailC;
  } catch {
    notFound();
  }

  return <ProjectEditor projectId={id} initial={detail} />;
}
