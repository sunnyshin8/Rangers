import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leak Radar",
  description: "Code & Secret Leak Radar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
