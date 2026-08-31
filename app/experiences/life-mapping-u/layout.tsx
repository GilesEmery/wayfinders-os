import type { Metadata } from "next";
import { LMUPersistenceHydrator } from "@/components/experiences/lmu/LMUPersistenceHydrator";

export const metadata: Metadata = {
  title: { default: "Life Mapping U", template: "%s | Life Mapping U" },
  description: "Recognize the patterns in your story, clarify what matters, and move thoughtfully toward what is next.",
};

export default function LifeMappingULayout({ children }: LayoutProps<"/experiences/life-mapping-u">) {
  return <><LMUPersistenceHydrator />{children}</>;
}
