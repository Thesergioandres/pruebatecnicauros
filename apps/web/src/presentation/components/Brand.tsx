export interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Logo de Soporte"
      className={className}
    >
      <title>Soporte</title>
      <rect x="0" y="0" width="32" height="32" rx="7" fill="var(--color-brand-600)" />
      <path
        d="M9 9h14a3 3 0 0 1 3 3v5h-3v-4a1 1 0 0 0-1-1H10a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5v3H9a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3Z"
        fill="white"
      />
      <circle cx="22" cy="22" r="3" fill="var(--color-brand-100)" />
    </svg>
  );
}
