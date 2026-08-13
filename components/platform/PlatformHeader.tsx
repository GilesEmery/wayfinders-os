import { platformNavigation } from "@/lib/platform/navigation";
import Link from "next/link";

export function PlatformHeader() {
  return (
    <header className="platform-header">
      <Link className="platform-brand" href="/" aria-label="Wayfinders home">
        Wayfinders
      </Link>
      <nav aria-label="Primary navigation">
        {platformNavigation.map((item) => (
          <Link href={item.href} key={item.href}>{item.label}</Link>
        ))}
      </nav>
    </header>
  );
}
