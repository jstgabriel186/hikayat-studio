import type { Metadata } from "next";
import { NewProjectWizard } from "@/components/project/new-project-wizard";

export const metadata: Metadata = { title: "Proyek Baru" };

export default function NewProjectPage() {
  return <NewProjectWizard />;
}
