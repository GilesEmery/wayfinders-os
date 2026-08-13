import { PlatformFooter } from "./PlatformFooter";
import { PlatformHeader } from "./PlatformHeader";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="platform-shell">
      <PlatformHeader />
      <main className="platform-main">{children}</main>
      <PlatformFooter />
    </div>
  );
}
