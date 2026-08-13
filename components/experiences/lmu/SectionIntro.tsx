interface SectionIntroProps {
  eyebrow: string;
  title: React.ReactNode;
  copy?: string;
}

export function SectionIntro({ eyebrow, title, copy }: SectionIntroProps) {
  return (
    <header className="section-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </header>
  );
}
