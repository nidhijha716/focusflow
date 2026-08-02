export type ClassValue = string | number | null | false | undefined | Record<string, boolean | null | undefined>;

/**
 * Minimal `clsx`-style class combiner. Kept dependency-free (no `clsx`/
 * `tailwind-merge` in package.json) since components only ever append a
 * handful of conditional classes -- not enough to justify a new dependency.
 */
export function cn(...values: ClassValue[]): string {
  const classes: string[] = [];

  for (const value of values) {
    if (!value) continue;

    if (typeof value === "string" || typeof value === "number") {
      classes.push(String(value));
      continue;
    }

    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) classes.push(key);
    }
  }

  return classes.join(" ");
}
