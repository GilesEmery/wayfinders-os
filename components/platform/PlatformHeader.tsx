import Image from "next/image";
import { PlatformAccountControl } from "./PlatformAccountControl";
import { PlatformBrand } from "./PlatformBrand";

export function PlatformHeader({ contextTitle, contextLogoUrl }: { contextTitle?: string; contextLogoUrl?: string | null }) {
  return (
    <header className="platform-header">
      <div className="platform-header-identity">
        <PlatformBrand />
        {contextTitle ? <span className="platform-header-context">{contextLogoUrl && <Image src={contextLogoUrl} alt="" width={112} height={36} unoptimized/>}<strong>{contextTitle}</strong></span> : null}
      </div>
      <div className="platform-header-actions">
        <PlatformAccountControl />
      </div>
    </header>
  );
}
