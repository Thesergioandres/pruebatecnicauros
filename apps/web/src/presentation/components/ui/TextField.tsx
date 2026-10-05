import { useId } from "react";

import type { ChangeEvent, ReactNode } from "react";

export interface TextFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "tel" | "url" | "search";
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "tel" | "url" | "search";
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
  onBlur?: () => void;
  ref?: React.Ref<HTMLInputElement>;
}

const FIELD_BASE =
  "block w-full rounded-md border bg-white px-3 py-2 text-sm text-[--color-text] shadow-sm transition-colors " +
  "placeholder:text-[--color-text-muted] " +
  "focus:outline-none focus:ring-2 focus:ring-[--color-brand-500]/30 focus:border-[--color-brand-500] " +
  "disabled:cursor-not-allowed disabled:bg-[--color-surface-muted] disabled:opacity-70";

const FIELD_BORDER = "border-[--color-border]";
const FIELD_INVALID = "border-[--color-danger-700] focus:border-[--color-danger-700] focus:ring-[--color-danger-700]/30";

export function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  error,
  hint,
  required,
  autoComplete,
  inputMode,
  disabled,
  placeholder,
  describedBy,
  onBlur,
  ref,
}: TextFieldProps) {
  const reactId = useId();
  const inputId = `field-${name}-${reactId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedByIds = [error ? errorId : null, hint ? hintId : null, describedBy]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-[--color-text]">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-[--color-danger-700]">
            *
          </span>
        ) : null}
      </label>
      <input
        id={inputId}
        ref={ref}
        name={name}
        type={type}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onBlur={onBlur}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds || undefined}
        aria-required={required || undefined}
        className={[FIELD_BASE, error ? FIELD_INVALID : FIELD_BORDER].join(" ")}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-[--color-text-muted]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-[--color-danger-700]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
