import { PriceTag } from "@/components/currency/PriceTag";
import { EARNING_LABELS, type EarningRow } from "@/lib/teammateEarnings";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

const TYPE_ICON: Record<string, string> = {
  ORDER_PAYOUT: "fa-solid fa-flag-checkered",
  PAYOUT_SENT: "fa-solid fa-arrow-up-from-bracket",
  ADJUSTMENT: "fa-solid fa-sliders",
};

/**
 * The append-only earnings ledger, rendered the same way for the teammate
 * and for an admin looking at them.
 */
export function EarningsLedger({ rows, emptyHint }: { rows: EarningRow[]; emptyHint: string }) {
  if (rows.length === 0) {
    return (
      <div className="dashboard-empty dashboard-empty--compact">
        <i className="fa-solid fa-receipt" aria-hidden="true" />
        <p>{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="admin-orders-table-wrap">
      <table className="dashboard-table earnings-table">
        <thead>
          <tr>
            <th>Entry</th>
            <th>Order</th>
            <th>Date</th>
            <th className="earnings-table__amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <span className="earnings-entry">
                  <span className={`earnings-entry__icon earnings-entry__icon--${row.type.toLowerCase()}`}>
                    <i className={TYPE_ICON[row.type] ?? "fa-solid fa-circle"} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{EARNING_LABELS[row.type]}</strong>
                    {row.note && <small>{row.note}</small>}
                  </span>
                </span>
              </td>
              <td>
                {row.order ? (
                  <span className="earnings-order">
                    <strong>#{row.order.orderNo}</strong>
                    <small>
                      {row.order.gameName} &middot; {row.order.option}
                    </small>
                  </span>
                ) : (
                  <span className="earnings-order__none">&mdash;</span>
                )}
              </td>
              <td>{dateFormat.format(row.createdAt)}</td>
              <td className={`earnings-table__amount${row.amountEUR < 0 ? " is-negative" : " is-positive"}`}>
                {row.amountEUR < 0 ? "−" : "+"}
                <PriceTag amountEUR={Math.abs(row.amountEUR)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
