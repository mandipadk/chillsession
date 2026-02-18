import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chillspace",
  description: "Virtual study space with proximity chat, lofi queue, and mini-games"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
