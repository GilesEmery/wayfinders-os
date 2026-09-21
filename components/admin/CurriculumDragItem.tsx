"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type DragEvent, type MouseEvent, type ReactNode } from "react";

type Kind = "module" | "lesson" | "section" | "block";
type DragPayload = { id: string; kind: Kind; parentId: string; index: number };

const MIME = "application/x-wayfinders-curriculum-item";
let activeDrag: DragPayload | null = null;

export function CurriculumDragItem({ action, id, kind, parentId, index, label, className, childDrop, href, keepVisible = false, positionControls, children }: {
  action: (form: FormData) => Promise<void>;
  id: string;
  kind: Kind;
  parentId: string;
  index: number;
  label: string;
  className: string;
  children: ReactNode;
  childDrop?: { kind: Kind; parentId: string; position: number };
  href?: string;
  keepVisible?: boolean;
  positionControls?: ReactNode;
}) {
  const router = useRouter();
  const itemRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"before" | "after" | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!keepVisible) return;
    requestAnimationFrame(() => itemRef.current?.scrollIntoView({ block: "nearest" }));
  }, [keepVisible]);

  function payload(event: DragEvent<HTMLElement>) {
    try {
      return JSON.parse(event.dataTransfer.getData(MIME)) as DragPayload || activeDrag;
    } catch {
      return activeDrag;
    }
  }

  function compatible(item: DragPayload | null) {
    if (!item || item.id === id) return false;
    if (childDrop?.kind === item.kind) return true;
    if (item.kind !== kind) return false;
    // Weeks and Content Blocks reorder only within their current container.
    // Lessons and Pages may be dragged into a different Week/Lesson in the
    // same Course, matching the nested curriculum sorter.
    return kind === "lesson" || kind === "section" || item.parentId === parentId;
  }

  function startDrag(event: DragEvent<HTMLElement>) {
      event.stopPropagation();
      activeDrag = { id, kind, parentId, index };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(MIME, JSON.stringify(activeDrag));
      const preview = document.createElement("div");
      preview.className = "course-builder-drag-preview";
      preview.textContent = label;
      document.body.append(preview);
      event.dataTransfer.setDragImage(preview, 18, 18);
      requestAnimationFrame(() => preview.remove());
      event.currentTarget.parentElement?.classList.add("is-dragging");
  }

  function endDrag(event: DragEvent<HTMLElement>) {
      event.stopPropagation();
      activeDrag = null;
      event.currentTarget.parentElement?.classList.remove("is-dragging");
      setPlacement(null);
  }

  function openItem(event: MouseEvent<HTMLDivElement>) {
    if (!href) return;
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (target.closest("a,button,input,select,textarea,summary,[role='button'],.course-builder-drag-handle")) return;
    router.push(href);
  }

  return <div
    ref={itemRef}
    className={`${className}${placement ? ` is-drop-${placement}` : ""}${pending ? " is-reordering" : ""}`}
    onClick={openItem}
    onDragOver={(event) => {
      const item = payload(event);
      if (!compatible(item)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      const bounds = event.currentTarget.getBoundingClientRect();
      setPlacement(item?.kind === kind && event.clientY < bounds.top + bounds.height / 2 ? "before" : "after");
    }}
    onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPlacement(null);
    }}
    onDrop={(event) => {
      const item = payload(event);
      if (!compatible(item)) return;
      event.preventDefault();
      event.stopPropagation();
      const isChildDrop = childDrop?.kind === item!.kind && item!.kind !== kind;
      const targetParentId = isChildDrop ? childDrop.parentId : parentId;
      let position = isChildDrop ? childDrop.position : index + (placement === "after" ? 1 : 0);
      if (!isChildDrop && item!.parentId === targetParentId && item!.index < position) position -= 1;
      const form = new FormData();
      form.set("kind", item!.kind);
      form.set("item_id", item!.id);
      form.set("parent_id", targetParentId);
      form.set("position", String(position));
      setPlacement(null);
      startTransition(() => action(form));
    }}
    aria-label={`${label}. Drag to reorder.`}
  ><span className="course-builder-drag-handle" draggable={!pending} onDragStart={startDrag} onDragEnd={endDrag} aria-label={`Drag ${label}`} title={`Drag ${label}`}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8M6 14v-2a2 2 0 0 0-4 0v2c0 4.42 3.58 8 8 8h2c4.42 0 8-3.58 8-8V8a2 2 0 0 0-4 0v3"/></svg></span>{positionControls}{children}</div>;
}
