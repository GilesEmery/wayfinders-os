import Image from "next/image";
import wayfindersMark from "@/public/brand/wayfinders/Wayfinders_Logo_Mark_White.svg";
import Link from "next/link";

export function PlatformBrand() {
  return <Link className="platform-brand" href="/dashboard" aria-label="Purpose OS — My Dashboard">
    <Image className="platform-brand-wayfinders" src={wayfindersMark} alt="Wayfinders" width={90} height={93} preload/>
    <span><strong>Purpose OS</strong><small>by Wayfinders</small></span>
  </Link>;
}
