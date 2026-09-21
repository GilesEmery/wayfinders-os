import Image from "next/image";
import Link from "next/link";
import type { CourseCardDisplay } from "@/lib/platform/course-card";

export function ParticipantCourseCard({ card, href, actionLabel, meta, variant = "vertical" }: { card: CourseCardDisplay; href: string; actionLabel: string; meta?: string | null; variant?: "vertical" | "horizontal" }) {
  return <article className={`participant-course-card is-${variant}`}>
    <div className="participant-course-card-media">
      {card.imageUrl ? <Image src={card.imageUrl} alt="" fill sizes="(max-width: 720px) 100vw, 38vw" unoptimized/> : <div className="participant-course-card-placeholder" aria-hidden="true"><span>Purpose OS</span></div>}
    </div>
    <div className="participant-course-card-body">
      {card.eyebrow && <p className="participant-course-card-eyebrow">{card.eyebrow}</p>}
      <h2>{card.headline}</h2>
      {card.supportingText && <p>{card.supportingText}</p>}
      {meta && <span className="participant-course-card-meta">{meta}</span>}
      <Link href={href}>{actionLabel}</Link>
    </div>
  </article>;
}
