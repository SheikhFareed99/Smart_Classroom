import { type ReactNode } from "react";
import { cn } from "../../lib/utils";
import "./PageContainer.css";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps page content with consistent max-width and padding.
 * Accounts for navbar height (64px) and sidebar width (260px).
 */
export default function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main className={cn("page-container", className)}>
      {children}
    </main>
  );
}

/**
 * Section wrapper — standardized vertical spacing between sections.
 */
export function Section({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("page-section", className)} {...props}>
      {children}
    </section>
  );
}
