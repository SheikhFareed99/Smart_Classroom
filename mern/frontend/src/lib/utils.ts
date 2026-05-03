import clsx, { type ClassValue } from "clsx";

/**
 * Conditional class-name helper.
 * Wraps clsx for consistent usage across the codebase.
 * If Tailwind is added later, swap to clsx + tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
