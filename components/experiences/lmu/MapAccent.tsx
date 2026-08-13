import Image from "next/image";

interface MapAccentProps {
  variant?: 1 | 2 | 3 | 4;
  position?: "left" | "right" | "center";
  opacity?: number;
  className?: string;
}

export function MapAccent({
  variant = 1,
  position = "right",
  opacity = 0.2,
  className = "",
}: MapAccentProps) {
  return (
    <div
      aria-hidden="true"
      className={`map-accent map-${position} ${className}`.trim()}
      style={{ opacity }}
    >
      <Image
        alt=""
        fill
        sizes="(max-width: 800px) 100vw, 55vw"
        src={`/brand/lmu/maps/map-gray-${variant}.svg`}
      />
    </div>
  );
}
