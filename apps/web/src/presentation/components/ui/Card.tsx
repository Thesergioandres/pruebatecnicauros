import type { HTMLAttributes, ReactNode } from "react";

/**
 * Card: superficie elevada con borde hairline y sombra minima. Es el
 * contenedor estandar para agrupar contenido denso sin gritar. Si
 * necesitas mas aire, usa `p-6` o `p-8` via `className`.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({ children, className, padded = true, ...rest }: CardProps) {
  const computed = [
    "rounded-lg border border-[--color-border] bg-[--color-surface] shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
    padded ? "p-5" : "",
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
  title: ReactNode;
  description?: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
  trailing?: ReactNode;
}

export function CardHeader({
  title,
  description,
  as: Heading = "h3",
  trailing,
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <Heading className="text-base font-semibold tracking-tight text-[--color-on-surface]">
          {title}
        </Heading>
        {description ? (
          <p className="text-sm text-[--color-on-surface-muted]">{description}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
