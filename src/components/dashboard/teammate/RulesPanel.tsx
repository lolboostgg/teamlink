import { TEAMMATE_RULES, RULES_CONSEQUENCE } from "@/lib/teammateRules";

export function RulesPanel() {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Rules</div>
          <div className="dashboard-panel__sub">What you agree to by taking orders</div>
        </div>
      </div>

      <div className="rules-grid">
        {TEAMMATE_RULES.map((group) => (
          <section className="rules-group" key={group.title}>
            <h3>
              <i className={group.icon} aria-hidden="true" />
              {group.title}
            </h3>
            <ul>
              {group.rules.map((rule) => (
                <li key={rule}>
                  <i className="fa-solid fa-circle-check" aria-hidden="true" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="rules-consequence">
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {RULES_CONSEQUENCE}
      </p>
    </div>
  );
}
