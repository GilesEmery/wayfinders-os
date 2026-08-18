import type { LMUIconName } from "../types";

export function LMUBadgeSymbol({ name, title }: { name: LMUIconName; title?: string }) {
  const shape = {
    story: <><path d="M3 5h7l2 2 2-2h7v14h-7l-2 2-2-2H3Z"/><path d="M12 7v14M6 9h3M15 9h3"/></>,
    realistic: <><path d="M10 2h4l.5 3 2 .8L19 4.1 21.9 7l-1.7 2.5.8 2 3 .5v4l-3 .5-.8 2 1.7 2.5-2.9 2.9-2.5-1.7-2 .8-.5 3h-4l-.5-3-2-.8L5 23.9 2.1 21l1.7-2.5-.8-2-3-.5v-4l3-.5.8-2L2.1 7 5 4.1l2.5 1.7 2-.8Z" transform="translate(2.4 2.4) scale(.8)"/><circle cx="12" cy="12" r="3"/></>,
    social: <><path d="M4 7h7v6H8l-3 3v-3H4ZM13 9h7v6h-1v3l-3-3h-3Z"/></>,
    conventional: <><path d="M7 5H5v16h14V5h-2M9 3h6v4H9Z"/><path d="m8 11 1.5 1.5L12 10M14 11h3M8 16l1.5 1.5L12 15M14 16h3"/></>,
    artistic: <><path d="M3 12c0-5 4-9 9-9 4 0 7 2 7 5 0 2-1 3-3 3h-2c-2 0-3 1-3 3s-1 4-4 4c-2.5 0-4-2.5-4-6Z"/><circle cx="7" cy="8" r="1"/><circle cx="11" cy="6" r="1"/><circle cx="6" cy="12" r="1"/><path d="m12 21 1-6 7-11 2 1-6 11ZM13 15l3 1"/></>,
    enterprising: <><path d="M7 10a5 5 0 1 1 10 0c0 2-1 3.5-2.5 5H9.5C8 13.5 7 12 7 10ZM9.5 18h5M10 21h4M12 3V1M5 4 3.5 2.5M19 4l1.5-1.5M5 10H2M22 10h-3"/><path d="M9.5 15h5v3h-5Z"/></>,
    investigative: <><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 6 6M9.4 8.7c0-.75.55-1.25 1.35-1.25S12.1 8 12.1 8.65c0 1.05-1.35 1.05-1.35 2.1M10.75 12.25v.3"/></>,
    teammates: <><circle cx="12" cy="7" r="2.6"/><circle cx="5.5" cy="9" r="2"/><circle cx="18.5" cy="9" r="2"/><path d="M7.5 19v-2.5c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5V19ZM1.8 18v-1.6c0-2.1 1.6-3.7 3.7-3.7 1.1 0 2.1.5 2.8 1.2M22.2 18v-1.6c0-2.1-1.6-3.7-3.7-3.7-1.1 0-2.1.5-2.8 1.2"/></>,
    supervisor: <><circle cx="9" cy="9" r="2.5"/><path d="M4.5 20v-3c0-2.8 1.8-4.8 4.5-4.8s4.5 2 4.5 4.8v3M14 11l5-5M15 6h4v4M15 15h5M18 12l2 3-2 3"/></>,
    values: <><circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5ZM12 1v3M12 20v3M1 12h3M20 12h3"/><circle cx="12" cy="12" r="1"/></>,
    growth: <><path d="M5 20h5v-5h5v-5h5"/><path d="m4 14 9-9M9 5h4v4"/></>,
    location: <><path d="m3.5 11 8.5-7 8.5 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-6h4v6"/></>,
    "x-factor": <path d="M5 5l14 14M19 5 5 19" strokeWidth="2.4"/>,
    salary: <><path d="M16.8 7.2c-.9-1.3-2.5-2-4.5-2-2.6 0-4.4 1.3-4.4 3.3 0 4.8 9.1 2.4 9.1 7.3 0 2.1-1.9 3.5-4.7 3.5-2.1 0-4-.8-5-2.2M12.2 2.8v18.4" strokeWidth="2.1"/></>,
    motivators: <><path d="M4 6h2M4 12h2M4 18h2M9 6h11M9 12h8M9 18h5"/><path d="M5 4.5v3M4 10.5h2l-2 3h2M4 16.5h2l-1.5 1.5L6 19.5H4" strokeWidth="1.3"/></>,
  }[name];

  return <svg aria-hidden={title ? undefined : true} role={title ? "img" : undefined} className="lmu-badge-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="square" strokeLinejoin="bevel">{title && <title>{title}</title>}{shape}</svg>;
}
