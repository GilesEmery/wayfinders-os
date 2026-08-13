import Link from "next/link";

interface SecondaryButtonProps {
  href: string;
  children: React.ReactNode;
}

export function SecondaryButton({ href, children }: SecondaryButtonProps) {
  return (
    <Link className="button button-secondary" href={href}>
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
