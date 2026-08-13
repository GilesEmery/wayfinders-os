import { getModuleDefinition } from "@/lib/experiences/lmu/module-registry";
import { notFound, permanentRedirect } from "next/navigation";

export default async function ModulePage({
  params,
}: PageProps<"/module/[moduleSlug]">) {
  const { moduleSlug } = await params;
  const moduleDefinition = getModuleDefinition(moduleSlug);
  if (!moduleDefinition) notFound();
  permanentRedirect(`/experiences/life-mapping-u/module/${moduleDefinition.slug}`);
}
