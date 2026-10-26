import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WayfindersAuthProvider } from "@/components/platform/WayfindersAuthProvider";
import { EmbeddedAssessmentDocument } from "@/components/platform/EmbeddedAssessmentDocument";

// Keep fonts local to avoid build-time Google Fonts requests and URL parsing.
const geist = localFont({
  src: "./fonts/geist.ttf",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const cormorant = localFont({
  src: "./fonts/cormorant-garamond.ttf",
  variable: "--font-editorial",
  weight: "400 600",
  display: "swap",
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
