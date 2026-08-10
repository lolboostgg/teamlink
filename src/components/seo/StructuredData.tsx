/**
 * One JSON-LD block, as a `@graph` so several nodes on one page reference
 * each other by `@id` instead of repeating the organisation four times.
 *
 * A server component with no client cost: this is a script tag with a string
 * in it, and nothing about it is interactive.
 */
export function StructuredData({ schemas }: { schemas: object[] }) {
  if (schemas.length === 0) return null;

  const graph = { "@context": "https://schema.org", "@graph": schemas };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is not HTML, so the one character that could
      // close the script tag early has to go. `<` is escaped rather than the
      // whole string re-encoded, which keeps the payload readable in view-source.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
