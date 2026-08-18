import type { RelocationOpenness } from "./types";

export const relocationOptions: Array<{ id: RelocationOpenness; label: string }> = [
  { id: "stay", label: "I prefer to stay where I am." },
  { id: "regional", label: "I would consider relocating within my current region." },
  { id: "right-opportunity", label: "I am open to relocating for the right opportunity." },
  { id: "very-open", label: "I am very open to relocating." },
];

const reasonId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const locationReasons = [
  "Family or relationships", "Community", "Career opportunities", "Cost of living", "Lifestyle", "Climate", "Culture", "Faith community", "Schools / education", "Outdoor access", "Familiarity", "New opportunities", "Pace of life", "Other",
].map((label) => ({ id: reasonId(label), label }));

export const locationConstraints = [
  "Family commitments", "Spouse / partner career", "Children / schools", "Financial considerations", "Housing", "Cost of living", "Health / care needs", "Visa / immigration", "Job availability", "Existing community", "Church / faith community", "Climate", "Distance from family", "Travel access", "Other",
];

export const relocationLabel = (id?: RelocationOpenness) => relocationOptions.find((item) => item.id === id)?.label ?? "";
