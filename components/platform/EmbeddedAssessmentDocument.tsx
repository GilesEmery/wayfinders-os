"use client";

import { useEffect } from "react";

const STORAGE_KEY = "purposeos:embedded-assessment:modal";

export function EmbeddedAssessmentDocument() {
  useEffect(() => {
    if (window.self === window.top) return;
    const explicit = new URLSearchParams(window.location.search).get("embeddedDisplay") === "modal";
    if (explicit) window.sessionStorage.setItem(STORAGE_KEY, "true");
    if (!explicit && window.sessionStorage.getItem(STORAGE_KEY) !== "true") return;
    document.documentElement.classList.add("embedded-assessment-document");
    return () => document.documentElement.classList.remove("embedded-assessment-document");
  }, []);
  return null;
}
