interface Shape {
  top: string;
  left?: string;
  right?: string;
  size: number;
  variant: "ring" | "dot";
  duration: number;
  delay: number;
}

const DEFAULT_SHAPES: Shape[] = [
  { top: "12%", left: "6%", size: 46, variant: "ring", duration: 9, delay: 0 },
  { top: "68%", left: "12%", size: 14, variant: "dot", duration: 7, delay: 1.2 },
  { top: "20%", right: "9%", size: 60, variant: "ring", duration: 11, delay: 0.6 },
  { top: "78%", right: "16%", size: 18, variant: "dot", duration: 8, delay: 2 },
  { top: "45%", left: "3%", size: 10, variant: "dot", duration: 6.5, delay: 0.4 },
];

// Purely decorative floating "astro" shapes (rings/dots), inspired by
// tapin.gg's floating illustrations in its how-it-works section — gives
// sections a sense of quiet motion without any gradient text/buttons.
export function FloatingShapes({ shapes = DEFAULT_SHAPES }: { shapes?: Shape[] }) {
  return (
    <div className="floating-shapes" aria-hidden="true">
      {shapes.map((s, i) => (
        <span
          key={i}
          className={`floating-shape floating-shape--${s.variant}`}
          style={{
            top: s.top,
            left: s.left,
            right: s.right,
            width: s.size,
            height: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
