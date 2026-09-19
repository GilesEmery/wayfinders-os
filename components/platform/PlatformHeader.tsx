import { PlatformAccountControl } from "./PlatformAccountControl";
import { PlatformBrand } from "./PlatformBrand";

export function PlatformHeader({ contextTitle }: { contextTitle?: string }) {
  return (
    <header className="platform-header">
      <div className="platform-header-identity">
        <PlatformBrand />
        {contextTitle ? <span className="platform-header-context">{contextTitle}</span> : null}
      </div>
      <div className="platform-header-actions">
        <PlatformAccountControl />
      </div>
    </header>
  );
}
