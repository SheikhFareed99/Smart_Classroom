import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft: IconLeft,
      iconRight: IconRight,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          "ui-btn",
          `ui-btn--${variant}`,
          `ui-btn--${size}`,
          loading && "ui-btn--loading",
          className
        )}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === "sm" ? 14 : size === "lg" ? 20 : 16} strokeWidth={1.75} className="ui-btn__spinner" aria-hidden="true" />
        ) : IconLeft ? (
          <IconLeft size={size === "sm" ? 14 : size === "lg" ? 20 : 16} strokeWidth={1.75} aria-hidden="true" />
        ) : null}

        {children && <span className="ui-btn__label">{children}</span>}

        {!loading && IconRight && (
          <IconRight size={size === "sm" ? 14 : size === "lg" ? 20 : 16} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
