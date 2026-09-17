"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { ResolvedAsset } from "@/lib/experiences/builder/resource-assets";

type ReaderMode = "reader" | "slides" | "fit_width";

function text(config: Record<string, unknown>, key: string) {
  return typeof config[key] === "string" ? config[key] as string : "";
}

export function ParticipantPdfReader(props: { config: Record<string, unknown>; asset?: ResolvedAsset }) {
  return <PdfReaderInstance key={props.asset?.url ?? "missing"} {...props}/>;
}

function PdfReaderInstance({ config, asset }: { config: Record<string, unknown>; asset?: ResolvedAsset }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLElement>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const loadingRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderRef = useRef<RenderTask | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const mode = (text(config, "readerMode") || "reader") as ReaderMode;
  const title = text(config, "title") || asset?.title || asset?.originalFilename || "PDF Reader";
  const description = text(config, "description") || asset?.description;

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const update = () => setWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadingRef.current?.destroy();
    loadingRef.current = null;
    documentRef.current = null;
    if (!asset?.url || asset.mimeType !== "application/pdf") return;
    void import("pdfjs-dist").then(async (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const loading = pdfjs.getDocument({ url: asset.url });
      loadingRef.current = loading;
      const document = await loading.promise;
      if (cancelled) return void loading.destroy();
      documentRef.current = document;
      setPageCount(document.numPages);
      setStatus("ready");
      setRefreshing(false);
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => {
      cancelled = true;
      renderRef.current?.cancel();
      void loadingRef.current?.destroy();
      loadingRef.current = null;
      documentRef.current = null;
    };
  }, [asset?.mimeType, asset?.url]);

  useEffect(() => {
    const document = documentRef.current;
    const canvas = canvasRef.current;
    if (status !== "ready" || !document || !canvas || !width) return;
    let cancelled = false;
    renderRef.current?.cancel();
    void document.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const fitted = Math.max(0.25, (width - 2) / base.width);
      const scale = fitted * zoom;
      const viewport = page.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");
      const task = page.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      renderRef.current = task;
      return task.promise;
    }).catch((error: unknown) => {
      if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) setStatus("error");
    });
    return () => { cancelled = true; renderRef.current?.cancel(); };
  }, [pageNumber, status, width, zoom]);

  const move = (next: number) => setPageNumber(Math.min(Math.max(next, 1), pageCount || 1));
  const retry = () => { setRefreshing(true); router.refresh(); };
  const fullscreen = async () => {
    if (!frameRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frameRef.current.requestFullscreen();
  };

  if (!asset) return <div className="participant-block-unavailable" role="status">PDF unavailable</div>;
  const readerStatus = asset.mimeType === "application/pdf" ? status : "error";

  return <figure className={`participant-pdf-reader is-${mode}`} ref={frameRef} onKeyDown={(event) => {
    if (mode !== "slides") return;
    if (event.key === "ArrowLeft") { event.preventDefault(); move(pageNumber - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(pageNumber + 1); }
  }} tabIndex={mode === "slides" ? 0 : undefined} aria-label={`${title} PDF reader`}>
    <figcaption>{title && <strong>{title}</strong>}{description && <span>{description}</span>}</figcaption>
    <div className="participant-pdf-toolbar" aria-label="PDF controls">
      <button type="button" onClick={() => move(pageNumber - 1)} disabled={readerStatus !== "ready" || pageNumber <= 1} aria-label="Previous PDF page">← <span>Previous</span></button>
      <output aria-live="polite">{pageCount ? `Page ${pageNumber} of ${pageCount}` : "Loading pages…"}</output>
      <button type="button" onClick={() => move(pageNumber + 1)} disabled={readerStatus !== "ready" || pageNumber >= pageCount} aria-label="Next PDF page"><span>Next</span> →</button>
      <span className="participant-pdf-zoom">
        <button type="button" onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(1))))} disabled={readerStatus !== "ready" || zoom <= 0.6} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setZoom(1)} disabled={readerStatus !== "ready"} aria-label="Fit PDF to width">Fit</button>
        <button type="button" onClick={() => setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(1))))} disabled={readerStatus !== "ready" || zoom >= 2} aria-label="Zoom in">+</button>
      </span>
      <button type="button" onClick={fullscreen} aria-label="View PDF fullscreen">Fullscreen</button>
    </div>
    <div className="participant-pdf-viewport" ref={viewportRef}>
      {readerStatus === "loading" && <div className="participant-pdf-state" role="status">Loading PDF…</div>}
      {readerStatus === "error" && <div className="participant-pdf-state" role="alert"><strong>Unable to load this PDF right now.</strong><button type="button" onClick={retry} disabled={refreshing}>{refreshing ? "Refreshing…" : "Retry"}</button></div>}
      <canvas ref={canvasRef} aria-label={`Page ${pageNumber} of ${pageCount || "unknown"}`} hidden={readerStatus !== "ready"}/>
    </div>
    <div className="participant-pdf-actions">
      <a href={asset.url} target="_blank" rel="noopener noreferrer">Open in new tab<span className="sr-only">: {asset.originalFilename || title}</span></a>
      <a href={asset.downloadUrl}>Download<span className="sr-only"> {asset.originalFilename || title}</span></a>
    </div>
  </figure>;
}
