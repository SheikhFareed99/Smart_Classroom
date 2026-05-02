import { type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface IconProps {
  /** A Lucide icon component, e.g. `BookOpen` */
  icon: LucideIcon;
  /** Pixel size — defaults to 20 */
  size?: number;
  /** Stroke width — defaults to 1.75 */
  strokeWidth?: number;
  /** Extra class names */
  className?: string;
  /** If provided the icon becomes accessible; otherwise it's decorative */
  "aria-label"?: string;
}

/**
 * Standardised icon wrapper around Lucide icons.
 * - Defaults: 20px, stroke 1.75
 * - Decorative by default (`aria-hidden="true"`)
 * - Pass `aria-label` to make it accessible
 */
export default function Icon({
  icon: LucideIcon,
  size = 20,
  strokeWidth = 1.75,
  className,
  "aria-label": ariaLabel,
}: IconProps) {
  return (
    <LucideIcon
      size={size}
      strokeWidth={strokeWidth}
      className={cn("icon", className)}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  );
}
