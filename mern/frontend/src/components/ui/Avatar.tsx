import { cn } from "../../lib/utils";
import "./Avatar.css";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: AvatarSize;
  status?: "online" | "offline" | "away";
  className?: string;
}

function getInitials(name?: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Avatar({ name, src, size = "md", status, className }: AvatarProps) {
  return (
    <div className={cn("ui-avatar", `ui-avatar--${size}`, className)}>
      {src ? (
        <img src={src} alt={name || "User"} className="ui-avatar__img" />
      ) : (
        <span className="ui-avatar__initials">{getInitials(name)}</span>
      )}
      {status && (
        <span
          className={cn("ui-avatar__status", `ui-avatar__status--${status}`)}
          aria-label={status}
        />
      )}
    </div>
  );
}
