import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import "./Badge.css";

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "error" | "info" | "ai";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children?: ReactNode;
}

export default function Badge({ variant = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span className={cn("ui-badge", `ui-badge--${variant}`, className)} {...props}>
      {children}
    </span>
  );
}
