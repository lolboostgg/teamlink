"use client";

import { useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";

// PromoBanner is disabled for now (see below) but this wrapper stays: it
// measures the header stack via ResizeObserver and exposes it as
// --offset-h on the root element, which Hero/games-page-hero use instead
// of the static --header-h to pull their ambient background up under the
// header without a gap — if the banner comes back later, this already
// accounts for its height too, since it only knows whether to render
// after a client-side localStorage check (so its height isn't known at
// first paint, and would otherwise throw that math off).
export function SiteTopbar() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--offset-h", `${entry.contentRect.height}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <Header />
    </div>
  );
}
