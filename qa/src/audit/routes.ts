/**
 * Route-coverage audit: a screen that is routed but not covered by the Day 17
 * audit or the release run, or a places screen with no link in the places menu,
 * is a screen nobody tests and nobody can reach. CI- and test-only.
 */

/** Every path="..." given to a <Route>. The catch-all "*" is left out. */
export function routePatterns(appSource: string): string[] {
  const patterns: string[] = [];
  for (const match of appSource.matchAll(/<Route\b[^>]*?\bpath="([^"]+)"/g)) {
    const pattern = match[1]!;
    if (pattern !== "*") patterns.push(pattern);
  }
  return patterns;
}

/** /places/:id matches /places/anything, but not /places/a/b. */
export function patternToRegex(pattern: string): RegExp {
  const source = pattern
    .split("/")
    .map((part) => (part.startsWith(":") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${source}$`);
}

/** A segment like :id has no fixed form, so only a concrete path can stand for it. */
export const isDynamic = (pattern: string) => pattern.includes(":");

/** Routes with no covered screen. A dynamic route needs a concrete path; a static one needs its own. */
export function routesWithoutScreen(patterns: readonly string[], screenPaths: readonly string[]): string[] {
  return patterns.filter((pattern) => {
    if (isDynamic(pattern)) {
      // A concrete path covers a dynamic route only if no static route would claim it first.
      const statics = patterns.filter((other) => !isDynamic(other));
      const regex = patternToRegex(pattern);
      return !screenPaths.some((path) => regex.test(path) && !statics.includes(path));
    }
    return !screenPaths.includes(pattern);
  });
}

/** Paths that are screens but are not named in the release run's route list (quoted strings in its source). */
export function pathsMissingFromSource(paths: readonly string[], source: string): string[] {
  return paths.filter((path) => !source.includes(`"${path}"`));
}

/** Static routes under a prefix with no <NavLink to="..."> in the menu source. */
export function routesWithoutMenuLink(patterns: readonly string[], prefix: string, menuSource: string): string[] {
  const linked = new Set([...menuSource.matchAll(/\bto="([^"]+)"/g)].map((m) => m[1]!));
  return patterns.filter((pattern) => pattern.startsWith(prefix) && !isDynamic(pattern) && !linked.has(pattern));
}
