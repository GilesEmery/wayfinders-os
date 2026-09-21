"use client";

import { useState, useTransition, type DragEvent, type ReactNode } from "react";

type DragPayload = { id: string; index: number };
const MIME = "application/x-wayfinders-companion-item";
let activeDrag: DragPayload | null = null;

export function CompanionDragItem({ action, id, index, count, label, children }: {
  action: (form: FormData) => Promise<void>;
  id: string;
  index: number;
  count: number;
  label: string;
  children: ReactNode;
}) {
  const [placement, setPlacement] = useState<"before" | "after" | null>(null);
  const [pending, startTransition] = useTransition();

  function move(position: number) {
    const form = new FormData();
    form.set("module_id", id);
    form.set("position", String(position));
    startTransition(() => action(form));
  }

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
    ><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8M6 14v-2a2 2 0 0 0-4 0v2c0 4.42 3.58 8 8 8h2c4.42 0 8-3.58 8-8V8a2 2 0 0 0-4 0v3"/></svg></span>
    <div className="course-builder-position-controls" aria-label={`${label} position`}>
      <button type="button" disabled={pending || index === 0} onClick={() => move(index - 1)} aria-label={`Move ${label} up`} title="Move up">↑</button>
      <button type="button" disabled={pending || index === count - 1} onClick={() => move(index + 1)} aria-label={`Move ${label} down`} title="Move down">↓</button>
    </div>
    {children}
  </div>;
}
