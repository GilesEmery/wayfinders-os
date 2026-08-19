import Image from "next/image";

interface LMULogoProps {
  variant?: "wordmark-invert" | "mark" | "mark-white";
  priority?: boolean;
  className?: string;
  decorative?: boolean;
}

const logoConfig = {
  "wordmark-invert": {
    src: "/brand/lmu/lmu-white.svg",
    alt: "Life Mapping U",
    width: 1500,
    height: 301,
  },
  mark: {
    src: "/brand/lmu/lmu-u-mark.png",
    alt: "Life Mapping U",
    width: 52,
    height: 49,
  },
  "mark-white": {
    src: "/brand/lmu/lmu-u-mark-white.png",
    alt: "Life Mapping U",
    width: 52,
    height: 49,
  },
} as const;

export function LMULogo({
  variant = "mark",
  priority = false,
  className = "",
  decorative = false,
}: LMULogoProps) {
  const logo = logoConfig[variant];

  return (
    <span className={`lmu-logo lmu-logo-${variant} ${className}`.trim()}>
      <Image
        alt={decorative ? "" : logo.alt}
        height={logo.height}
        priority={priority}
        src={logo.src}
        width={logo.width}
      />
      <span className="logo-fallback" aria-hidden="true">Life Mapping U</span>
    </span>
  );
}
