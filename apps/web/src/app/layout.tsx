import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leak Ranger",
  description: "Code & Secret Leak Ranger",
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
