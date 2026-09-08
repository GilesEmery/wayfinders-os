import { PlatformAccountControl } from "./PlatformAccountControl";
import { PlatformBrand } from "./PlatformBrand";
import { PlatformExperiencesMenu } from "./PlatformExperiencesMenu";

export function PlatformHeader() {
  return (
    <header className="platform-header">
      <PlatformBrand />
      <div className="platform-header-actions">
        <nav aria-label="Primary navigation">
          <PlatformExperiencesMenu />
        </nav>
        <PlatformAccountControl />
      </div>
    </header>
  );
}
