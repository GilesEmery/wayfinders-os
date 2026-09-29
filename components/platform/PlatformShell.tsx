import { PlatformFooter } from "./PlatformFooter";
import { PlatformHeader } from "./PlatformHeader";

export function PlatformShell({ children, contextTitle, contextLogoUrl }: { children: React.ReactNode; contextTitle?: string; contextLogoUrl?: string | null }) {
  return (
    <div className={`platform-shell${contextTitle ? " is-course-context" : ""}`}>
      <PlatformHeader contextTitle={contextTitle} contextLogoUrl={contextLogoUrl} />
      <main className="platform-main">{children}</main>
      <PlatformFooter />
    </div>
  );
}
