export interface LoginActivityEntry {
  ip: string;
  device: string;
  location: string;
  /** ISO timestamp. Older records predate this field. */
  at?: string;
}

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const minutes = Math.round((then - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, "hour");
  return RELATIVE.format(Math.round(hours / 24), "day");
}

/**
 * Login activity, newest first.
 *
 * The newest entry is the session you're on. Anything below it that arrived
 * from a different address than the entry before it is called out — a login
 * from a new IP is the one signal in this list worth reacting to, and a flat
 * list of near-identical rows buries it.
 */
export function LoginActivityList({
  entries,
  title = "Login activity",
  subtitle = "Devices that have accessed this account",
}: {
  entries: LoginActivityEntry[];
  title?: string;
  subtitle?: string;
}) {
  if (entries.length === 0) {
    return (
      <section className="security-logins">
        <div className="security-logins__head">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <div className="dashboard-empty dashboard-empty--compact">
          <i className="fa-solid fa-shield-halved" aria-hidden="true" />
          <p>No sign-ins recorded yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="security-logins">
      <div className="security-logins__head">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      <ul className="login-activity">
        {entries.map((entry, index) => {
          const current = index === 0;
          // Compared against the next *older* entry: this row is where the
          // address changed, so that is the row to flag.
          const previous = entries[index + 1];
          const ipChanged = !current && Boolean(previous) && previous.ip !== entry.ip;
          const when = relativeTime(entry.at);

          return (
            <li key={`${entry.ip}-${entry.at ?? index}`} className={`login-activity__row${ipChanged ? " is-alert" : ""}`}>
              <span className="login-activity__icon">
                <i className="fa-solid fa-display" aria-hidden="true" />
              </span>

              <div className="login-activity__main">
                <div className="login-activity__title">
                  <strong>{entry.device}</strong>
                  {current && <span className="login-activity__badge login-activity__badge--current">Current</span>}
                  {ipChanged && (
                    <span className="login-activity__badge login-activity__badge--alert">
                      <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> IP change
                    </span>
                  )}
                </div>
                <div className="login-activity__meta">
                  {when && (
                    <>
                      <span>{current ? "Last active" : "Signed in"}</span>
                      <span>{when}</span>
                    </>
                  )}
                  <span>{entry.location}</span>
                </div>
              </div>

              <code className="login-activity__ip">{entry.ip}</code>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
