"use client";

import { useRouter } from "next/navigation";

export function FinishModuleButton() {
  const router = useRouter();

  return (
    <button className="button button-secondary module-finish-button" type="button" onClick={() => router.push("/experiences/life-mapping-u/original/modules")}>
      <span>Finish</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}
