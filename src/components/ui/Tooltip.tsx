import type { ReactNode } from "react";

// Wraps an existing element (flag, icon, etc.) with a custom-styled hover
// bubble instead of the browser's native title="" tooltip, which is
// unstyled and looks out of place against the rest of the design system.
export function Tooltip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <span className={`tooltip-host${className ? ` ${className}` : ""}`} tabIndex={0}>
      {children}
      <span className="tooltip-bubble" role="tooltip">
        {label}
      </span>
    </span>
  );
}
