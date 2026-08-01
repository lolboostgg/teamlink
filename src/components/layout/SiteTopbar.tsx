"use client";

import { useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { PromoBanner } from "@/components/layout/PromoBanner";

// PromoBanner only knows whether it should render after a client-side
// localStorage check, so its height isn't known at first paint — it pops
// in shortly after mount. Hero (and games-page-hero) pull their ambient
// background up under the header using a negative margin sized off
// --header-h; if the banner appears afterward without that math updating,
// the background falls short of the banner's extra height, leaving a gap.
// This measures the actual header+banner stack and exposes it as
// --offset-h on the root element so those sections stay correct either way.
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
      <PromoBanner />
    </div>
  );
}
