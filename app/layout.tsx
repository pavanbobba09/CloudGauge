import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudGauge — Multi-cloud cost planning",
  description: "Compare public on-demand cloud costs before you deploy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
