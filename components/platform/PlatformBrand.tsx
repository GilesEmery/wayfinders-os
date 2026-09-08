import Image from "next/image";
import Link from "next/link";

export function PlatformBrand() {
  return <Link className="platform-brand" href="/dashboard" aria-label="Purpose OS — My Dashboard">
    <Image className="platform-brand-wayfinders" src="/brand/wayfinders/Wayfinders_Logo_Mark_White.svg" alt="Wayfinders" width={90} height={93} priority/>
    <span><strong>Purpose OS</strong><small>by Wayfinders</small></span>
  </Link>;
}
