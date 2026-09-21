"use client";

import { useState, useTransition, type DragEvent, type ReactNode } from "react";

type DragPayload = { id: string; index: number };
const MIME = "application/x-wayfinders-companion-item";
let activeDrag: DragPayload | null = null;

export function CompanionDragItem({ action, id, index, label, children }: {
  action: (form: FormData) => Promise<void>;
  id: string;
  index: number;
  label: string;
  children: ReactNode;
}) {
  const [placement, setPlacement] = useState<"before" | "after" | null>(null);
  const [pending, startTransition] = useTransition();

  function payload(event: DragEvent<HTMLElement>) {
    try {
      return JSON.parse(event.dataTransfer.getData(MIME)) as DragPayload || activeDrag;
    } catch {
      return activeDrag;
    }
  }

  return <div
    className={`companion-builder-drag-item${placement ? ` is-drop-${placement}` : ""}${pending ? " is-reordering" : ""}`}
    onDragOver={(event) => {
      const item = payload(event);
      if (!item || item.id === id) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const bounds = event.currentTarget.getBoundingClientRect();
      setPlacement(event.clientY < bounds.top + bounds.height / 2 ? "before" : "after");
    }}
    onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPlacement(null);
    }}
    onDrop={(event) => {
      const item = payload(event);
      if (!item || item.id === id) return;
      event.preventDefault();
      let position = index + (placement === "after" ? 1 : 0);
      if (item.index < position) position -= 1;
      const form = new FormData();
      form.set("module_id", item.id);
      form.set("position", String(position));
      setPlacement(null);
      startTransition(() => action(form));
    }}
  >
    <span
      className="course-builder-drag-handle"
      draggable={!pending}
      onDragStart={(event) => {
        activeDrag = { id, index };
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(MIME, JSON.stringify(activeDrag));
        const preview = document.createElement("div");
        preview.className = "course-builder-drag-preview";
        preview.textContent = label;
        document.body.append(preview);
        event.dataTransfer.setDragImage(preview, 18, 18);
        requestAnimationFrame(() => preview.remove());
        event.currentTarget.parentElement?.classList.add("is-dragging");
      }}
      onDragEnd={(event) => {
        activeDrag = null;
        event.currentTarget.parentElement?.classList.remove("is-dragging");
        setPlacement(null);
      }}
      aria-label={`Drag ${label}`}
      title={`Drag ${label}`}
    ><i aria-hidden="true">⋮⋮</i></span>
    {children}
  </div>;
}
