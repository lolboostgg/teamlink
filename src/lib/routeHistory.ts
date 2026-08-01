let previousPathname: string | null = null;
let currentPathname: string | null = null;

// Updated synchronously during RouteTracker's render (not in an effect) so
// it's guaranteed correct before any other component's effects run for the
// same navigation — React finishes rendering the whole tree before any
// effects fire, so as long as RouteTracker renders on every page (mounted
// in the root marketing layout), this is settled before e.g. Hero's
// mount effect reads it.
export function recordPathname(pathname: string): void {
  if (pathname === currentPathname) return;
  previousPathname = currentPathname;
  currentPathname = pathname;
}

export function getPreviousPathname(): string | null {
  return previousPathname;
}
