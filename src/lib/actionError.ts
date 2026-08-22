/**
 * Server-action failure reporting.
 *
 * Next replaces the message of anything *thrown* out of a server action in a
 * production build with its placeholder ("An error occurred in the Server
 * Components render. The specific message is omitted…") — which is what a
 * form's catch block ends up showing the user, and it says nothing about
 * what actually went wrong. Worse, the real error never reaches the app log
 * either unless we log it ourselves.
 *
 * So actions return an ActionResult instead: the failure text is data, it
 * survives the trip, and the underlying error is written to the server log
 * on the way out.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export function actionFailure(error: string): ActionResult {
  return { ok: false, error };
}

/**
 * Logs the real error (Hostinger app log / stderr) and returns a line the
 * user can act on.
 *
 * The error *code* travels to the browser because it is the one detail that
 * turns "saving is broken" into a diagnosis — P2025 is a missing row, P1001
 * is an unreachable pooler, 25006 is a read-only database (a Supabase
 * project over its disk quota). The raw message stays in the log, since it
 * can carry query text.
 */
export function describeActionError(scope: string, err: unknown): string {
  console.error(`[action:${scope}]`, err);
  const code = errorCode(err);
  return code
    ? `Couldn't save — the database refused the change (${code}). Please try again; the app log has the details.`
    : "Couldn't save — something went wrong on the server. Please try again.";
}

function errorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const { code } = err as { code?: unknown };
  return typeof code === "string" && code.length <= 12 ? code : null;
}
