import { LMUFooter } from "./LMUFooter";
import { LMUHeader } from "./LMUHeader";
import { LMURouteScrollReset } from "./LMURouteScrollReset";

interface LMUShellProps {
  children: React.ReactNode;
  context?: string;
  theme?: "dark" | "light";
  journeyHref?: string;
  onJourneyReturn?: () => void;
  onInternalBack?: () => void;
}

export function LMUShell({ children, context, theme = "light", onJourneyReturn, onInternalBack }: LMUShellProps) {
  return (
    <div className={`lmu-shell shell-${theme}`}>
      <LMURouteScrollReset />
      <LMUHeader context={context} theme={theme} onJourneyReturn={onJourneyReturn} />
      {onInternalBack && (
        <nav className="lmu-top-back" aria-label="Previous step">
          <button className="lmu-compact-action" type="button" onClick={onInternalBack}>← Back</button>
        </nav>
      )}
      <main className="shell-main">{children}</main>
      <LMUFooter />
    </div>
  );
}
