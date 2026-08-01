"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export interface VariantMeta {
  key: string;
  name: string;
}

interface Props {
  variants: VariantMeta[];
  paramName?: string;
}

// Floating variant switcher for the "prototype" skill's UI flow — lets the
// homepage's design variants be flipped through and compared live. Gated to
// non-production builds so a stray merge never ships this to real users.
export function PrototypeSwitcher({ variants, paramName = "variant" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? variants[0].key;
  const index = Math.max(0, variants.findIndex((v) => v.key === current));

  const go = useCallback(
    (nextIndex: number) => {
      const wrapped = (nextIndex + variants.length) % variants.length;
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramName, variants[wrapped].key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams, variants, paramName],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, index]);

  if (process.env.NODE_ENV === "production") return null;

  const activeVariant = variants[index];

  return (
    <div className="proto-switcher">
      <button type="button" onClick={() => go(index - 1)} aria-label="Previous variant">
        <i className="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>
      <span className="proto-switcher__label">
        <strong>{activeVariant.key}</strong> — {activeVariant.name}
      </span>
      <button type="button" onClick={() => go(index + 1)} aria-label="Next variant">
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
