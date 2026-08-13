import Link from "next/link";
import { LMULogo } from "./LMULogo";

interface LMUHeaderProps {
  context?: string;
  theme?: "dark" | "light";
}

export function LMUHeader({ context, theme = "light" }: LMUHeaderProps) {
  return (
    <header className={`site-header header-${theme}`}>
      <Link className="wordmark" href="/experiences/life-mapping-u" aria-label="Life Mapping U home">
        <LMULogo variant={theme === "dark" ? "wordmark-invert" : "mark"} priority />
      </Link>
      {context && <p className="header-context">{context}</p>}
    </header>
  );
}
