import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/app/app-header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hikayat Studio — Paket Produksi Video Sejarah",
    template: "%s · Hikayat Studio",
  },
  description:
    "Ubah transkrip video asing menjadi paket produksi video YouTube sejarah Indonesia: naskah VO orisinal, scene cards, SEO pack, dan subtitle — siap diedit di CapCut.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppHeader />
        <main className="flex-1 flex flex-col">{children}</main>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
