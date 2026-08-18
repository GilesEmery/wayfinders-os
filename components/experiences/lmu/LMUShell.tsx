import { LMUFooter } from "./LMUFooter";
import { LMUHeader } from "./LMUHeader";
import { LMURouteScrollReset } from "./LMURouteScrollReset";

interface LMUShellProps {
  children: React.ReactNode;
  context?: string;
  theme?: "dark" | "light";
  journeyHref?: string;
  onJourneyReturn?: () => void;
}

export function LMUShell({ children, context, theme = "light", journeyHref, onJourneyReturn }: LMUShellProps) {
  return (
    <div className={`lmu-shell shell-${theme}`}>
      <LMURouteScrollReset />
      <LMUHeader context={context} theme={theme} journeyHref={journeyHref} onJourneyReturn={onJourneyReturn} />
      <main className="shell-main">{children}</main>
      <LMUFooter />
    </div>
  );
}
