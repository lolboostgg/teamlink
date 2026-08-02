interface Props {
  secondsLeft: number;
  progressPct: number;
  caption: string;
}

// Blue-to-violet progress ring for the "pick your teammate" phase — its own
// visual moment distinct from the plain cyan ring on the searching screen
// (see .match-ring in globals.css), built from the same two accent colors
// the rest of the site already uses (--cta-vivid, --hue-purple).
export function SelectionCountdown({ secondsLeft, progressPct, caption }: Props) {
  return (
    <div className="selection-countdown">
      <div
        className="selection-countdown__ring"
        style={{ "--selection-progress": `${progressPct}%` } as React.CSSProperties}
        role="timer"
        aria-live="polite"
        aria-label={`${secondsLeft} seconds left`}
      >
        <span className="selection-countdown__spark selection-countdown__spark--a" aria-hidden="true" />
        <span className="selection-countdown__spark selection-countdown__spark--b" aria-hidden="true" />
        <span className="selection-countdown__time">{secondsLeft}</span>
      </div>
      <p className="selection-countdown__caption">{caption}</p>
    </div>
  );
}
