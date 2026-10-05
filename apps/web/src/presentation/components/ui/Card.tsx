import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...rest }: CardProps) {
  const computed = [
    "rounded-xl border border-[--color-border] bg-[--color-surface] shadow-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={computed} {...rest}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: string;
  description?: string;
  as?: "h1" | "h2" | "h3";
}

export function CardHeader({ title, description, as: Heading = "h1" }: CardHeaderProps) {
  return (
    <div className="space-y-1">
      <Heading className="text-xl font-semibold tracking-tight text-[--color-text]">{title}</Heading>
      {description ? (
        <p className="text-sm text-[--color-text-muted]">{description}</p>
      ) : null}
    </div>
  );
}
