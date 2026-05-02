import { cn } from "../../lib/utils";
import "./Skeleton.css";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export default function Skeleton({ width, height, borderRadius, className }: SkeletonProps) {
  return (
    <div
      className={cn("ui-skeleton", className)}
      style={{ width, height, borderRadius }}
      aria-busy="true"
      aria-label="Loading..."
    />
  );
}

/* Pre-configured skeleton shapes */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("ui-skeleton-text", className)} aria-busy="true" aria-label="Loading content...">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="ui-skeleton"
          style={{
            height: 14,
            width: i === lines - 1 ? "60%" : "100%",
            borderRadius: "var(--radius-sm)",
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("ui-skeleton-card", className)} aria-busy="true" aria-label="Loading card...">
      <div className="ui-skeleton" style={{ height: 100, borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }} />
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div className="ui-skeleton" style={{ height: 18, width: "70%", borderRadius: "var(--radius-sm)" }} />
        <div className="ui-skeleton" style={{ height: 14, width: "40%", borderRadius: "var(--radius-sm)" }} />
      </div>
    </div>
  );
}
