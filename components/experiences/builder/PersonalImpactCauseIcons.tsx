import type { SVGProps } from "react";

const lineStyle = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function AddictionRecoveryIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...lineStyle} {...props}><path d="m8 14 6-6 3 3-6 6-3-3Zm6-6 2-2m-1-1 3 3m-1 3 2-2m-1-1 3 3M8 17l-3 3m5-8 2 2"/><circle cx="12" cy="12" r="10"/><path d="m5 5 14 14"/></svg>;
}

export function BrokenShacklesIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...lineStyle} {...props}><circle cx="5.5" cy="15.5" r="4.5"/><circle cx="18.5" cy="8.5" r="4.5"/><path d="m8.5 12 2-2 2 1-1 2m4-1-2 2-2-1 1-2M10 6l-1-2m4 3 1-2m-1 13 1 2m-4-3-1 2"/></svg>;
}

export function BentPrisonBarsIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...lineStyle} {...props}><path d="M3 3h18M3 21h18M5 3v18M19 3v18M10 3v5l-3 4 3 4v5M14 3v5l3 4-3 4v5"/></svg>;
}
