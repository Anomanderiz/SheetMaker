import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, IM_Fell_English } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const imFellEnglish = IM_Fell_English({
  variable: "--font-im-fell-english",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Librum",
    template: "%s · Librum",
  },
  description:
    "Librum — build, maintain, and share character dossiers for tabletop campaigns. Structured stats, lore, session notes, galleries, and editable relationship maps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzel.variable} ${cinzelDecorative.variable} ${imFellEnglish.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
