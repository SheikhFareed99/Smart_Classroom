import { type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import Button from "./Button";
import "./EmptyState.css";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: LucideIcon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("ui-empty", className)}>
      <LucideIcon size={48} strokeWidth={1.5} className="ui-empty__icon" aria-hidden="true" />
      <h3 className="ui-empty__title">{title}</h3>
      {description && <p className="ui-empty__desc">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="ui-empty__cta">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/* Error State — same layout, with retry CTA */
export function ErrorState({
  icon: LucideIcon,
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  icon: LucideIcon;
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("ui-empty", className)}>
      <LucideIcon size={48} strokeWidth={1.5} className="ui-empty__icon ui-empty__icon--error" aria-hidden="true" />
      <h3 className="ui-empty__title">{title}</h3>
      {description && <p className="ui-empty__desc">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="ui-empty__cta">
          Try again
        </Button>
      )}
    </div>
  );
}
