"use client";

import { useRef, useState } from "react";

const UPLOAD_TARGET_BYTES = 3 * 1024 * 1024;

async function prepareImage(file: File): Promise<File> {
  if (file.size <= UPLOAD_TARGET_BYTES) return file;
  // Preserve animations rather than silently replacing a GIF with its first frame.
  if (file.type === "image/gif") throw new Error("Choose a GIF under 3 MB, or use a PNG, JPG, or WebP image.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image. Try a smaller image.");
    let longestSide = Math.min(2400, Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = longestSide / Math.max(image.naturalWidth, image.naturalHeight);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .9));
      if (blob && blob.size <= UPLOAD_TARGET_BYTES) {
        const extension = blob.type === "image/webp" ? "webp" : "png";
        return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${extension}`, { type: blob.type, lastModified: file.lastModified });
      }
      longestSide *= .75;
    }
    throw new Error("This image could not be reduced for upload. Try a smaller image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CourseImageInput({ disabled }: { disabled: boolean }) {
  const selection = useRef(0);
  const [message, setMessage] = useState("");
  return <><input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required disabled={disabled} onChange={async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const current = ++selection.current;
    input.setCustomValidity("");
    setMessage("");
    if (!file) return;
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("This image is too large. Choose an image up to 25 MB.");
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("Choose a PNG, JPG, WebP, or GIF image.");
      if (file.size <= UPLOAD_TARGET_BYTES) return;
      input.setCustomValidity("Please wait while your image is prepared.");
      setMessage("Preparing image…");
      const prepared = await prepareImage(file);
      if (selection.current !== current || !input.isConnected) return;
      const transfer = new DataTransfer();
      transfer.items.add(prepared);
      input.files = transfer.files;
      input.setCustomValidity("");
      setMessage(`Image ready to upload (${(prepared.size / 1024 / 1024).toFixed(1)} MB).`);
    } catch (error) {
      if (selection.current !== current || !input.isConnected) return;
      const detail = error instanceof Error ? error.message : "The image could not be prepared. Try a smaller image.";
      input.setCustomValidity(detail);
      setMessage(detail);
      input.reportValidity();
    }
  }}/><small role="status" aria-live="polite">{message}</small></>;
}
