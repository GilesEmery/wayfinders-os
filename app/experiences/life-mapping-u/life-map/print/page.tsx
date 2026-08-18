import { LifeMapPlaceholder } from "@/components/experiences/lmu/LifeMapPlaceholder";
import { getModuleDefinition } from "@/lib/experiences/lmu/module-registry";
import { notFound } from "next/navigation";

export default function LifeMapPrintPage() {
  const definition = getModuleDefinition("your-life-map");
  if (!definition) notFound();
  return <LifeMapPlaceholder module={definition} printMode />;
}
