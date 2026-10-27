"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function DeleteButton({ title }: { title: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-label={`Delete section: ${title}`} title="Delete section"><Trash2 size={14} aria-hidden="true"/><span className="sr-only">{pending ? "Deleting…" : "Delete section"}</span></button>;
}

export function DeleteOutlineSection({ action, title }: { action: (form: FormData) => Promise<void>; title: string }) {
  return <form action={action} className="course-builder-section-delete" onClick={event => event.stopPropagation()} onSubmit={event => {
    if (!window.confirm(`Delete “${title}” and all its content? This cannot be undone.`)) event.preventDefault();
  }}>
    <input type="hidden" name="confirm_delete" value="yes"/>
    <DeleteButton title={title}/>
  </form>;
}
