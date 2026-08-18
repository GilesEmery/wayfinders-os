import Image from "next/image";

interface LifeMapContourProgressProps {
  completed: number;
  total: number;
  className?: string;
  showCaption?: boolean;
}

export function LifeMapContourProgress({ completed, total, className = "", showCaption = true }: LifeMapContourProgressProps) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className={`contour-progress ${className}`.trim()} aria-label={`${completed} of ${total} discovery sections complete`}>
      <div className="contour-frame">
        <Image className="contour-base" alt="" fill src="/brand/lmu/maps/map-gray-4.svg" sizes="320px" />
        <div className="contour-reveal" style={{ clipPath: `inset(0 ${100 - percentage}% 0 0)` }} aria-hidden="true" />
      </div>
      {showCaption && <div className="contour-caption"><span>{completed} of {total}</span><span>{percentage}%</span></div>}
    </div>
  );
}
