"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { prepareBlockAssetUploadAction, completeBlockAssetUploadAction } from "@/app/admin/trainings/[experienceId]/versions/[versionId]/sections/[sectionId]/layout/actions";

type Props = { experienceId: string; versionId: string; sectionId: string; blockId: string; accept: string; label: string; buttonLabel: string };

export function BlockAssetUpload({ experienceId, versionId, sectionId, blockId, accept, label, buttonLabel }: Props) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("file");
    if (!(file instanceof File) || !file.size) { setMessage("Choose a non-empty file."); return; }
    if (file.size > 25 * 1024 * 1024) { setMessage("Files may be up to 25 MB."); return; }
    if (file.size > 4.5 * 1000 * 1000 && !window.confirm(
      `This file is ${(file.size / 1000 / 1000).toFixed(1)} MB, which is larger than 4.5 MB. Do you want to upload it?\n\nChoose Cancel to reduce the file size first, or OK to continue uploading.`,
    )) {
      setMessage("Upload canceled. You can reduce the file size and choose a replacement.");
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage("Preparing upload…");
    try {
      const metadata = { name: file.name, type: file.type, size: file.size, title: String(values.get("asset_title") ?? "") };
      const prepared = await prepareBlockAssetUploadAction(experienceId, versionId, sectionId, blockId, metadata);
      if (!prepared.ok) throw new Error(prepared.error);
      setMessage("Uploading file…");
      const { bucket, path, token } = prepared.upload;
      const result = await createBrowserSupabaseClient().storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (result.error) throw new Error("The file could not be uploaded. Check your connection and try again.");
      setMessage("Checking and attaching file…");
      const completed = await completeBlockAssetUploadAction(experienceId, versionId, sectionId, blockId, path, metadata);
      if (!completed.ok) throw new Error(completed.error);
      form.reset();
      setMessage("File uploaded and attached.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The upload failed. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return <form onSubmit={upload} aria-busy={pending}>
    <fieldset disabled={pending}>
      <label>{label}<input name="file" type="file" accept={accept} required/></label>
      <label>Resource title<input name="asset_title" maxLength={200}/></label>
      <p>Maximum 25 MB.</p>
      <button type="submit">{pending ? "Uploading…" : buttonLabel}</button>
    </fieldset>
    {message && <p role="status" aria-live="polite">{message}</p>}
  </form>;
}
