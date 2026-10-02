import { headers } from "next/headers";
import { requireExperiencePasswordBySlug } from "@/lib/experiences/access/server";

export default async function ExperiencesLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-purposeos-request-path");
  const match = path?.match(/^\/experiences\/([^/?]+)/);
  if (match) await requireExperiencePasswordBySlug(decodeURIComponent(match[1]), path!);
  return children;
}
