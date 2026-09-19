import { PlatformFooter } from "./PlatformFooter";
import { PlatformHeader } from "./PlatformHeader";

export function PlatformShell({ children, contextTitle }: { children: React.ReactNode; contextTitle?: string }) {
  return (
    <div className={`platform-shell${contextTitle ? " is-course-context" : ""}`}>
      <PlatformHeader contextTitle={contextTitle} />
      <main className="platform-main">{children}</main>
      <PlatformFooter />
    </div>
  );
}
