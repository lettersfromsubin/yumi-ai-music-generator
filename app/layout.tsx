import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yumi | Guided AI Music Generation",
  description: "A guided AI music generation MVP for shaping mood, genre, lyrics, and sound direction."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
