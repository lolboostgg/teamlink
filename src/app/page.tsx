import { Suspense } from "react";
import { VariantA } from "@/components/home/variants/VariantA";
import { VariantB } from "@/components/home/variants/VariantB";
import { VariantC } from "@/components/home/variants/VariantC";
import { PrototypeSwitcher } from "@/components/prototype/PrototypeSwitcher";

// Three structurally different homepage designs, switchable via ?variant=
// (prototype skill, UI sub-shape A — same route, real header/footer, only
// the content swaps). See the commit message / PR description for what
// each one is testing:
//   A — classic vertical flow, full-bleed hero (closest to tapin.gg's look)
//   B — booking widget embedded directly in the hero (tapin.gg's actual
//       homepage pattern — "configure here", not "browse then click in")
//   C — compact search-first hero + bento feature grid (eloboost.gg's
//       dashboard-preview style)
const VARIANTS = [
  { key: "A", name: "Classic flow" },
  { key: "B", name: "Book in the hero" },
  { key: "C", name: "Dashboard bento" },
];

interface Props {
  searchParams: Promise<{ variant?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { variant } = await searchParams;

  return (
    <main>
      {variant === "B" ? <VariantB /> : variant === "C" ? <VariantC /> : <VariantA />}
      <Suspense fallback={null}>
        <PrototypeSwitcher variants={VARIANTS} />
      </Suspense>
    </main>
  );
}
