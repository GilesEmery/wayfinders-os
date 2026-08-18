import type { LMUInstructionalMedia } from "@/lib/experiences/lmu/types";

interface LMUInstructionalVideoProps extends LMUInstructionalMedia {
  className?: string;
}

export function LMUInstructionalVideo({
  videoId,
  title,
  provider,
  description,
  durationMinutes,
  className = "",
}: LMUInstructionalVideoProps) {
  if (provider !== "youtube") return null;

  return (
    <section className={`instructional-video ${className}`.trim()} aria-labelledby={`video-${videoId}-title`}>
      <header className="instructional-video-heading">
        <div>
          <p className="eyebrow">Section overview</p>
          <h2 id={`video-${videoId}-title`}>{title}</h2>
        </div>
        {durationMinutes && <span>{durationMinutes} min</span>}
      </header>
      {description && <p className="instructional-video-description">{description}</p>}
      <div className="instructional-video-frame">
        <iframe
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title={title}
        />
      </div>
    </section>
  );
}
