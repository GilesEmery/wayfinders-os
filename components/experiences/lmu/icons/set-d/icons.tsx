import type { LMUFamilyIconProps } from "../types";

export function SetDIcon({ name, title }: LMUFamilyIconProps) {
  const shape = {
    story: <><path d="M4 6h6l2 2 2-2h6v13h-6l-2 2-2-2H4Z"/><path d="M12 8v13"/><circle cx="12" cy="4" r="1" fill="currentColor" stroke="none"/></>,
    realistic: <><circle cx="12" cy="12" r="9"/><circle cx="9" cy="14" r="3.5"/><circle cx="9" cy="14" r="1"/><path d="M9 8v2M9 18v2M3 14h2M13 14h2"/><circle cx="16.5" cy="7.5" r="2.5"/><path d="M16.5 3.5V5M16.5 10v1.5M12.5 7.5H14M19 7.5h1.5"/></>,
    social: <><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="2"/><circle cx="16" cy="9" r="1.5"/><path d="M5.5 17c1-3 2.3-4 4.5-4s3.5 1 4.5 4M14 13c2.5 0 4 1 4.5 3"/></>,
    conventional: <><rect x="3" y="3" width="18" height="18" rx="9"/><path d="M8 8h8v8H8ZM8 12h8M12 8v8"/></>,
    artistic: <><circle cx="12" cy="12" r="9"/><path d="M5 13c0-4 3-7 7-7 4.5 0 7 2.5 7 5 0 1.5-1 2-2.5 2-2 0-2.5 1-2 2.5.5 2-1 3-3 3C7.5 18.5 5 16.5 5 13Z"/><path d="m8 19 2-4 7-7 2 2-7 7Z"/></>,
    enterprising: <><path d="M12 3 21 12 12 21 3 12Z"/><path d="M7 10h10v3H7ZM9 13h6l1 5H8ZM12 10V7c0-1 1-2 2-2h2"/><circle cx="17.5" cy="5" r="1.5"/></>,
    investigative: <><circle cx="12" cy="12" r="9"/><circle cx="10" cy="13" r="4"/><path d="m13 16 5 4M6 8l2-3h4l2 3 2 1-2 1H6L4 9Z"/></>,
    teammates: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="8" r="2"/><circle cx="7" cy="10" r="1.5"/><circle cx="17" cy="10" r="1.5"/><path d="M8 18c.4-3.5 1.7-5 4-5s3.6 1.5 4 5M4 17c.3-2.5 1.3-3.7 3-3.7M20 17c-.3-2.5-1.3-3.7-3-3.7"/></>,
    supervisor: <><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="2"/><path d="M5 19c.4-4 1.7-6 4-6s3.6 2 4 6M14 12l5-5M16 7h3v3"/></>,
    values: <><circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/></>,
    growth: <><circle cx="12" cy="12" r="9"/><path d="M5 17h4v-4h4V9h4V5M14 5h3v3"/></>,
    location: <><circle cx="12" cy="12" r="9"/><path d="m5 12 7-6 7 6M7 11v7h10v-7M10.5 18v-4h3v4"/></>,
    "x-factor": <><circle cx="12" cy="12" r="9"/><path d="M7 7l10 10M17 7 7 17" strokeWidth="2"/></>,
    salary: <><circle cx="12" cy="12" r="9"/><path d="M16 7c-.9-1.2-2.2-1.8-4-1.8-2.3 0-3.8 1.1-3.8 2.9 0 4.1 7.8 2 7.8 6.3 0 1.8-1.6 3-4.1 3-1.8 0-3.4-.7-4.3-1.9M12 3.5v17" strokeWidth="1.8"/></>,
    motivators: <><circle cx="12" cy="12" r="9"/><path d="M6 8h2M10 8h7M6 12h2M10 12h5M6 16h2M10 16h3"/></>,
  }[name];
  return <svg aria-hidden={title ? undefined : true} role={title ? "img" : undefined} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{title && <title>{title}</title>}{shape}</svg>;
}
