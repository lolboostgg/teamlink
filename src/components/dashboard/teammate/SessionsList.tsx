import { getGameBySlug } from "@/lib/games";
import { GameCover } from "@/components/home/GameCover";
import type { UpcomingSession } from "@/lib/dashboard/teammateData";

export function SessionsList({ sessions }: { sessions: UpcomingSession[] }) {
  return (
    <div className="dashboard-list">
      {sessions.map((s) => {
        const game = getGameBySlug(s.gameSlug);
        return (
          <div className="dashboard-list-item" key={s.id}>
            {game && (
              <div className="dashboard-row-game__cover">
                <GameCover game={game} compact />
              </div>
            )}
            <div className="dashboard-list-item__meta">
              <div className="dashboard-list-item__title">{s.gameName} with {s.client}</div>
              <div className="dashboard-list-item__sub">{s.date} · {s.durationMin} min</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
