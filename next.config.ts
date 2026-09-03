import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ============================================================
     Output file tracing — agar folder /prompts (markdown system
     prompts yang DIBACA saat runtime via fs) ikut terbawa ke
     serverless (Vercel). Di host Node biasa folder sudah ada.
     ============================================================ */
  outputFileTracingIncludes: {
    "/api/projects/[id]/script": ["./prompts/**/*"],
    "/api/projects/[id]/media": ["./prompts/**/*"],
    "/api/projects/[id]/seo": ["./prompts/**/*"],
    "/api/projects/[id]/scenes/[sceneId]/regenerate": ["./prompts/**/*"],
    "/api/projects/[id]/subtitles/en": ["./prompts/**/*"],
    "/api/projects/[id]/export": ["./prompts/**/*"],
    "/api/projects/[id]/ingest": ["./prompts/**/*"],
    "/api/projects": ["./prompts/**/*"],
  },
};

export default nextConfig;
