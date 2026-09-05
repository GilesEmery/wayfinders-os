import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import "./globals.css";
import { WayfindersAuthProvider } from "@/components/platform/WayfindersAuthProvider";
import { getPlatformAccount } from "@/lib/platform/auth";

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const account = await getPlatformAccount();
  return (
    <html lang="en" className={`${geist.variable} ${cormorant.variable}`}>
      <body><WayfindersAuthProvider initialAccount={account}>{children}</WayfindersAuthProvider></body>
    </html>
  );
}
