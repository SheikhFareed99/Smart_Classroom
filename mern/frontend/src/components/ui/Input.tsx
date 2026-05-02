import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import "./Input.css";

/* ---------- Input ---------- */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  iconLeft?: LucideIcon;
  iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, iconLeft: IconLeft, iconRight, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("ui-field", error && "ui-field--error", className)}>
        {label && (
          <label className="ui-field__label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="ui-input-wrapper">
          {IconLeft && (
            <span className="ui-input__icon ui-input__icon--left" aria-hidden="true">
              <IconLeft size={16} strokeWidth={1.75} />
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "ui-input",
              IconLeft && "ui-input--has-left",
              iconRight && "ui-input--has-right"
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {iconRight && (
            <span className="ui-input__icon ui-input__icon--right">
              {iconRight}
            </span>
          )}
        </div>
        {error && (
          <p className="ui-field__error" id={`${inputId}-error`} role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="ui-field__helper" id={`${inputId}-helper`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

/* ---------- Textarea ---------- */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("ui-field", error && "ui-field--error", className)}>
        {label && (
          <label className="ui-field__label" htmlFor={textareaId}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className="ui-textarea"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p className="ui-field__error" id={`${textareaId}-error`} role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="ui-field__helper" id={`${textareaId}-helper`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
