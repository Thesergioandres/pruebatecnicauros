export interface FormErrorProps {
  message: string | null | undefined;
  title?: string;
  id?: string;
}

export function FormError({ message, title, id }: FormErrorProps) {
  if (!message) return null;
  return (
    <div
      id={id}
      role="alert"
      className="rounded-md border border-[var(--color-danger-200)] bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]"
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <p>{message}</p>
    </div>
  );
}
