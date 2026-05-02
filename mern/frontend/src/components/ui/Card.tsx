import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import "./Card.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive";
  children?: ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("ui-card", variant === "interactive" && "ui-card--interactive", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

/* Sub-components for structured content */
export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("ui-card__header", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("ui-card__content", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("ui-card__footer", className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
