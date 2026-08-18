import Link from "next/link";
import { LMULogo } from "./LMULogo";

interface LMUHeaderProps {
  context?: string;
  theme?: "dark" | "light";
  journeyHref?: string;
  onJourneyReturn?: () => void;
}

export function LMUHeader({ context, theme = "light", journeyHref, onJourneyReturn }: LMUHeaderProps) {
  return (
    <header className={`site-header header-${theme}`}>
      <Link className="wordmark" href="/experiences/life-mapping-u" aria-label="Life Mapping U home">
        <LMULogo variant={theme === "dark" ? "wordmark-invert" : "mark"} priority />
      </Link>
      <div className="header-module-nav">
        {journeyHref && <Link className="header-journey-link" href={journeyHref} onClick={onJourneyReturn}><span aria-hidden="true">←</span> Return to sections</Link>}
        {context && <p className="header-context">{context}</p>}
      </div>
    </header>
  );
}
