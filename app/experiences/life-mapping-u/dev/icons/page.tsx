import { LMUIconGallery } from "@/components/experiences/lmu/icons/LMUIconGallery";
import { LMUShell } from "@/components/experiences/lmu/LMUShell";
import { LMU_DEV_UNLOCK_ALL } from "@/lib/experiences/lmu/development";
import { notFound } from "next/navigation";

export default function LMUIconPreviewPage() {
  if (!LMU_DEV_UNLOCK_ALL) notFound();
  return <LMUShell context="Icon Preview" theme="dark"><LMUIconGallery /></LMUShell>;
}
