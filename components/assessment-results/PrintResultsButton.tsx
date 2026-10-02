"use client";

import { Printer } from "lucide-react";

export function PrintResultsButton() {
  return <button className="assessment-results-print" type="button" onClick={() => window.print()}><Printer aria-hidden="true"/> Print / Save as PDF</button>;
}
