export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-tooltip" tabIndex={0}>
      <i className="fa-solid fa-circle-info" aria-hidden="true" />
      <span className="tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
