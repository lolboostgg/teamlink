import Link from "next/link";
import { getGameBySlug } from "@/lib/games";
import { GameCover } from "@/components/home/GameCover";
import { PriceTag } from "@/components/currency/PriceTag";
import type { ClientBooking } from "@/lib/dashboard/clientData";

const STATUS_PILL: Record<ClientBooking["status"], string> = {
  upcoming: "dashboard-pill--success",
  completed: "dashboard-pill--muted",
  cancelled: "dashboard-pill--warning",
};

export function BookingsTable({ bookings }: { bookings: ClientBooking[] }) {
  return (
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Game</th>
          <th>Option</th>
          <th>Date</th>
          <th>Price</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {bookings.map((b) => {
          const game = getGameBySlug(b.gameSlug);
          return (
            <tr key={b.id}>
              <td>
                <div className="dashboard-row-game">
                  {game && (
                    <div className="dashboard-row-game__cover">
                      <GameCover game={game} compact />
                    </div>
                  )}
                  <span className="dashboard-table__primary">{b.gameName}</span>
                </div>
              </td>
              <td>{b.option} · {b.teammates} teammate{b.teammates > 1 ? "s" : ""}</td>
              <td>{b.date}</td>
              <td>
                <PriceTag amountEUR={b.priceEUR} />
              </td>
              <td>
                <span className={`dashboard-pill ${STATUS_PILL[b.status]}`}>{b.status}</span>
              </td>
              <td>
                {b.status !== "cancelled" && (
                  <Link href={`/games/${b.gameSlug}`} className="btn btn--ghost btn--sm">
                    Rebook
                  </Link>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
