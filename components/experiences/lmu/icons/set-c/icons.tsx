import type { LMUFamilyIconProps } from "../types";

export function SetCIcon({ name, title }: LMUFamilyIconProps) {
  const shape = {
    story: <><path d="M3.5 7c3-2 6-1.3 8.5.7C14.5 5.7 17.5 5 20.5 7v11c-3-2-6-1.3-8.5.7C9.5 16.7 6.5 16 3.5 18Z"/><path d="M12 7.7v11"/></>,
    realistic: <><circle cx="8.5" cy="14.5" r="4.5"/><circle cx="8.5" cy="14.5" r="1.5"/><path d="M8.5 7.5v2.5M8.5 19v2.5M1.5 14.5H4M13 14.5h2.5M3.5 9.5l2 2M11.5 17.5l2 2"/><circle cx="17" cy="7" r="3"/><circle cx="17" cy="7" r="1"/><path d="M17 2.5V4M17 10v1.5M12.5 7H14M20 7h1.5"/></>,
    social: <><path d="M4 12c0-4 3-7 7-7s7 3 7 7-3 7-7 7c-2 0-4-.7-5.5-2L3 19l1-4c0-1-.2-2-.2-3Z"/><path d="M8 12c1 1 2 1.5 3 1.5s2-.5 3-1.5"/></>,
    conventional: <><path d="M5 8c0-2 1.5-3 3.5-3h7C17.5 5 19 6 19 8v8c0 2-1.5 3-3.5 3h-7C6.5 19 5 18 5 16Z"/><path d="M9 5v14M5 10h14M14 10v9"/></>,
    artistic: <><path d="M4 13c0-5 4-9 9-9 5 0 8 3 8 6 0 2-1 3-3 3h-2c-1.5 0-2.5 1-2.5 2.5S12.5 19 10 19c-3.5 0-6-2.5-6-6Z"/><circle cx="8" cy="9" r="1"/><circle cx="6.5" cy="12" r="1"/><path d="m7 21 2-5 9-9 2 2-9 9ZM17 6l2-2 2 2-2 2"/></>,
    enterprising: <><path d="M5 10h14v3H5ZM8 13h8l2 8H6Z"/><path d="M12 10V7c0-2 1.5-3 3.5-3H17"/><rect x="17" y="3" width="4" height="2" rx="1"/></>,
    investigative: <><circle cx="10" cy="13" r="5"/><path d="m14 17 6 5M5 7c.5-2 1.5-3 3-3h4c1.5 0 2.5 1 3 3l3 1-3 2H5L2 8Z"/></>,
    teammates: <><circle cx="12" cy="7" r="2.5"/><circle cx="6" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><path d="M7 20c.4-5 2-7 5-7s4.6 2 5 7M2 19c.3-3.5 1.6-5 4-5M22 19c-.3-3.5-1.6-5-4-5"/></>,
    supervisor: <><circle cx="9" cy="9" r="2.5"/><path d="M4 20c.4-5 2-7 5-7s4.6 2 5 7M14 11l6-6M16 5h4v4"/></>,
    values: <><circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/></>,
    growth: <><path d="M3 20h5v-5h5v-5h5V5M15 5h3v3"/></>,
    location: <><path d="m3.5 11 8.5-7 8.5 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-6h4v6"/></>,
    "x-factor": <path d="M5 5l14 14M19 5 5 19" strokeWidth="2.3"/>,
    salary: <><path d="M17 7c-1-1.3-2.5-2-4.5-2C9.8 5 8 6.3 8 8.4c0 4.7 9 2.3 9 7.2 0 2.1-1.9 3.5-4.7 3.5-2.1 0-4-.8-5-2.2M12.2 2.8v18.4" strokeWidth="2.1"/></>,
    motivators: <path d="M4 6h2M9 6h11M4 12h2M9 12h8M4 18h2M9 18h5"/>,
  }[name];
  return <svg aria-hidden={title ? undefined : true} role={title ? "img" : undefined} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{title && <title>{title}</title>}{shape}</svg>;
}
