import { useId } from "react";

import type { ChangeEvent, ReactNode } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<SelectOption>;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
}

const FIELD_BASE =
  "block w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--color-text)] shadow-sm transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:border-[var(--color-brand-500)] " +
  "disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:opacity-70";

const FIELD_BORDER = "border-[var(--color-border)]";
const FIELD_INVALID = "border-[var(--color-danger-700)] focus:border-[var(--color-danger-700)] focus:ring-[var(--color-danger-700)]/30";

export function Select({
  label,
  name,
  value,
  onChange,
  options,
  error,
  hint,
  required,
  disabled,
  placeholder,
  describedBy,
}: SelectProps) {
  const reactId = useId();
  const selectId = `field-${name}-${reactId}`;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;
  const describedByIds = [error ? errorId : null, hint ? hintId : null, describedBy]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-sm font-medium text-[var(--color-text)]">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-[var(--color-danger-700)]">
            *
          </span>
        ) : null}
      </label>
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds || undefined}
        aria-required={required || undefined}
        className={[FIELD_BASE, error ? FIELD_INVALID : FIELD_BORDER].join(" ")}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
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
