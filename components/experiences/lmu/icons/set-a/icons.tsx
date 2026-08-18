import type { LMUFamilyIconProps } from "../types";

export function SetAIcon({ name, title }: LMUFamilyIconProps) {
  const shape = {
    story: <><path d="M3 6.5c3.2-1.2 6.2-.6 9 1.4 2.8-2 5.8-2.6 9-1.4v12c-3.2-1.2-6.2-.6-9 1.4-2.8-2-5.8-2.6-9-1.4Z"/><path d="M12 7.9v12"/></>,
    realistic: <><circle cx="8" cy="15" r="4"/><circle cx="8" cy="15" r="1.3"/><path d="M8 8v3M8 19v3M1 15h3M12 15h3M3 10l2 2M11 18l2 2"/><circle cx="17" cy="7" r="3"/><circle cx="17" cy="7" r="1"/><path d="M17 2v2M17 10v2M12 7h2M20 7h2"/></>,
    social: <><circle cx="8" cy="9" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6M14 14c3.8-.6 6.2 1.4 7 5"/></>,
    conventional: <><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 10h16M10 4v16M15 10v10"/></>,
    artistic: <><path d="M4 13c0-5 4-9 9-9 5 0 8 3 8 6 0 2-1 3-3 3h-2c-2 0-3 1-3 3s-1 3-3 3c-4 0-6-2-6-6Z"/><circle cx="8" cy="9" r="1"/><path d="m7 21 2-5 9-9 2 2-9 9ZM17 6l2-2 2 2-2 2"/></>,
    enterprising: <><path d="M5 10h14v3H5ZM8 13h8l2 8H6Z"/><path d="M12 10V7c0-2 1-3 3-3h2M17 3h4v2h-4"/></>,
    investigative: <><circle cx="10" cy="13" r="5"/><path d="m14 17 6 5M5 7l2-3h6l2 3 3 1-3 2H5L2 8Z"/></>,
    teammates: <><circle cx="12" cy="7" r="2.5"/><circle cx="6" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><path d="M7 20c.4-5 2-7 5-7s4.6 2 5 7M2 19c.3-3.5 1.6-5 4-5M22 19c-.3-3.5-1.6-5-4-5"/></>,
    supervisor: <><circle cx="9" cy="9" r="2.5"/><path d="M4 20c.4-5 2-7 5-7s4.6 2 5 7M14 11l6-6M16 5h4v4"/></>,
    values: <><circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/></>,
    growth: <><path d="M3 20h5v-5h5v-5h5V5M15 5h3v3"/></>,
    location: <><path d="m3.5 11 8.5-7 8.5 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-6h4v6"/></>,
    "x-factor": <path d="M5 5l14 14M19 5 5 19" strokeWidth="2.3"/>,
    salary: <><path d="M17 7c-1-1.3-2.5-2-4.5-2C9.8 5 8 6.3 8 8.4c0 4.7 9 2.3 9 7.2 0 2.1-1.9 3.5-4.7 3.5-2.1 0-4-.8-5-2.2M12.2 2.8v18.4" strokeWidth="2.1"/></>,
    motivators: <path d="M4 6h2M9 6h11M4 12h2M9 12h8M4 18h2M9 18h5"/>,
  }[name];
  return <svg aria-hidden={title ? undefined : true} role={title ? "img" : undefined} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">{title && <title>{title}</title>}{shape}</svg>;
}
