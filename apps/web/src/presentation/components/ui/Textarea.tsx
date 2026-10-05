import { useId } from "react";

import type { ChangeEvent, ReactNode } from "react";

export interface TextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  describedBy?: string;
  ref?: React.Ref<HTMLTextAreaElement>;
}

const FIELD_BASE =
  "block w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--color-text)] shadow-sm transition-colors " +
  "placeholder:text-[var(--color-text-muted)] " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:border-[var(--color-brand-500)] " +
  "disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:opacity-70";

const FIELD_BORDER = "border-[var(--color-border)]";
const FIELD_INVALID = "border-[var(--color-danger-700)] focus:border-[var(--color-danger-700)] focus:ring-[var(--color-danger-700)]/30";

export function Textarea({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  placeholder,
  rows = 4,
  maxLength,
  describedBy,
  ref,
}: TextareaProps) {
  const reactId = useId();
  const textareaId = `field-${name}-${reactId}`;
  const errorId = `${textareaId}-error`;
  const hintId = `${textareaId}-hint`;
  const describedByIds = [error ? errorId : null, hint ? hintId : null, describedBy]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label htmlFor={textareaId} className="block text-sm font-medium text-[var(--color-text)]">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-[var(--color-danger-700)]">
            *
          </span>
        ) : null}
      </label>
      <textarea
        id={textareaId}
        ref={ref}
        name={name}
        value={value}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds || undefined}
        aria-required={required || undefined}
        className={[FIELD_BASE, "resize-y", error ? FIELD_INVALID : FIELD_BORDER].join(" ")}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-[var(--color-danger-700)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
