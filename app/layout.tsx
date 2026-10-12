import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import "./globals.css";
import { WayfindersAuthProvider } from "@/components/platform/WayfindersAuthProvider";
import { EmbeddedAssessmentDocument } from "@/components/platform/EmbeddedAssessmentDocument";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Wayfinders",
    template: "%s | Wayfinders",
  },
  description:
    "Guided experiences, tools, and resources for moving toward meaningful action.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${cormorant.variable}`}>
      <body><EmbeddedAssessmentDocument/><WayfindersAuthProvider initialAccount={null}>{children}</WayfindersAuthProvider></body>
    </html>
  );
}
