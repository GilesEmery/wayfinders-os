import Link from "next/link";

interface PrimaryButtonProps {
  href: string;
  children: React.ReactNode;
}

export function PrimaryButton({ href, children }: PrimaryButtonProps) {
  return (
    <Link className="button button-primary" href={href}>
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
