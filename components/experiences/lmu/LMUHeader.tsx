import Link from "next/link";
import { LMULogo } from "./LMULogo";
import { PlatformAccountControl } from "@/components/platform/PlatformAccountControl";

interface LMUHeaderProps {
  context?: string;
  theme?: "dark" | "light";
  onJourneyReturn?: () => void;
}

export function LMUHeader({ context, theme = "light", onJourneyReturn }: LMUHeaderProps) {
  return (
    <header className={`site-header header-${theme}`}>
      <Link className="wordmark" href="/experiences/life-mapping-u/original/modules" aria-label="Life Mapping U — Back to Modules" onClick={onJourneyReturn}>
        <LMULogo variant={theme === "dark" ? "wordmark-invert" : "mark"} priority />
      </Link>
      <div className="header-module-nav">
        {context && <p className="header-context">{context}</p>}
        <PlatformAccountControl />
      </div>
    </header>
  );
}
