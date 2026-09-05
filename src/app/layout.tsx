import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sistem Klinik",
    template: "%s · Sistem Klinik",
  },
  description: "Sistem pengurusan klinik GP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Fon sistem digunakan dan bukan next/font supaya binaan on-prem tidak
    // memerlukan capaian internet ke Google Fonts.
    <html lang="ms" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
