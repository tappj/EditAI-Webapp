import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "EditAI: #1 Video Editor",
  openGraph: {
    title: "EditAI — Make room for your ideas.",
    description:
      "We find your best takes, add captions, and make every frame yours.",
    type: "website",
  },
  description:
    "A complete AI video editing studio. Edit, caption, transcribe and export your videos in your browser.",
  icons: { icon: "/favicon.svg" },
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
