import { platformNavigation } from "@/lib/platform/navigation";
import Link from "next/link";
import { PlatformAccountControl } from "./PlatformAccountControl";

export function PlatformHeader() {
  return (
    <header className="platform-header">
      <Link className="platform-brand" href="/" aria-label="Wayfinders home">
        Wayfinders
      </Link>
      <div className="platform-header-actions">
        <nav aria-label="Primary navigation">
          {platformNavigation.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>
        <PlatformAccountControl />
      </div>
    </header>
  );
}
