import type { RefObject } from "react";

interface LMUScreenHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  className?: string;
}

export function LMUScreenHeading({ eyebrow, title, description, headingRef, className = "" }: LMUScreenHeadingProps) {
  return (
    <header className={`lmu-screen-heading ${className}`.trim()}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
