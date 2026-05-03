// Reusable course color utility for consistent color assignment across panels

export const COURSE_BANNER_COLORS = ["blue", "green", "purple", "orange", "pink", "teal", "indigo"];

export function hashCourseSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getCourseBannerColor(): string {
  // Pick a random color from the available colors
  const colorIndex = Math.floor(Math.random() * COURSE_BANNER_COLORS.length);
  return COURSE_BANNER_COLORS[colorIndex];
}
