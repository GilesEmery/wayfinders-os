"use client";

import { useRef, useTransition, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";

export function InlineCurriculumTitle({ action, label, title }: {
  action: (form: FormData) => Promise<void>;
  label: string;
  title: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedValue = useRef(title);
  const [pending, startTransition] = useTransition();

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const form = formRef.current;
    const input = inputRef.current;
    const value = input?.value.trim() ?? "";
    if (!form || !input || !value || value === savedValue.current || pending) return;
    input.value = value;
    startTransition(async () => {
      await action(new FormData(form));
      savedValue.current = value;
    });
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.currentTarget.value = savedValue.current;
      event.currentTarget.blur();
    }
  }

  function contain(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return <form ref={formRef} className={`course-builder-inline-title${pending ? " is-saving" : ""}`} action={action} onSubmit={submit} onClick={contain}>
    <label>
      <span className="sr-only">{label} name</span>
      <input ref={inputRef} name="title" defaultValue={title} required maxLength={200} onBlur={() => submit()} onKeyDown={keyDown} aria-label={`${label} name`}/>
    </label>
    <span className="course-builder-inline-title-status" aria-live="polite">{pending ? "Saving…" : ""}</span>
  </form>;
}
