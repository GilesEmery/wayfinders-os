"use client";

import { useEffect } from "react";
import { returnFromAssessment } from "@/lib/experiences/builder/assessment-return";

const STORAGE_KEY = "purposeos:embedded-assessment:modal";

export function EmbeddedAssessmentDocument() {
  useEffect(() => {
    if (window.self === window.top) return;
    const explicit = new URLSearchParams(window.location.search).get("embeddedDisplay") === "modal";
    if (explicit) window.sessionStorage.setItem(STORAGE_KEY, "true");
    if (!explicit && window.sessionStorage.getItem(STORAGE_KEY) !== "true") return;
    document.documentElement.classList.add("embedded-assessment-document");
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    const closeOnReturn = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor || !returnTo) return;
      if (new URL(anchor.getAttribute("href")!, window.location.href).href !== new URL(returnTo, window.location.origin).href) return;
      event.preventDefault();
      event.stopPropagation();
      returnFromAssessment(returnTo);
    };
    document.addEventListener("click", closeOnReturn, true);
    return () => {
      document.removeEventListener("click", closeOnReturn, true);
      document.documentElement.classList.remove("embedded-assessment-document");
    };
  }, []);
  return null;
}
