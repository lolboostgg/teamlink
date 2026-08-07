"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export interface PrototypeVariantMeta {
  key: string;
  name: string;
}

interface Props {
  variants: PrototypeVariantMeta[];
  current: string;
  paramName?: string;
}

// THROWAWAY — see .claude/skills/prototype/UI.md. Not for production;
// gated on NODE_ENV so a stray merge can't ship this bar to users. Lets the
// user flip between the booking-section variants on the real homepage
// instead of three vague mockups in their head.
export function PrototypeSwitcher({ variants, current, paramName = "variant" }: Props) {
  if (process.env.NODE_ENV === "production") return null;
  return <PrototypeSwitcherInner variants={variants} current={current} paramName={paramName} />;
}

function PrototypeSwitcherInner({ variants, current, paramName }: Required<Props>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const index = Math.max(0, variants.findIndex((v) => v.key === current));
  const active = variants[index] ?? variants[0];

  function go(nextIndex: number) {
    const wrapped = (nextIndex + variants.length) % variants.length;
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, variants[wrapped].key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "ArrowRight") go(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div className="prototype-switcher" role="toolbar" aria-label="Prototype variant switcher">
      <button type="button" onClick={() => go(index - 1)} aria-label="Previous variant">
        <i className="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>
      <span className="prototype-switcher__label">
        <strong>{active.key}</strong> — {active.name}
      </span>
      <button type="button" onClick={() => go(index + 1)} aria-label="Next variant">
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
