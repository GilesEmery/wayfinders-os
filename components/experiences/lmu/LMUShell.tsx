import { LMUFooter } from "./LMUFooter";
import { LMUHeader } from "./LMUHeader";

interface LMUShellProps {
  children: React.ReactNode;
  context?: string;
  theme?: "dark" | "light";
}

export function LMUShell({ children, context, theme = "light" }: LMUShellProps) {
  return (
    <div className={`lmu-shell shell-${theme}`}>
      <LMUHeader context={context} theme={theme} />
      <main className="shell-main">{children}</main>
      <LMUFooter />
    </div>
  );
}
