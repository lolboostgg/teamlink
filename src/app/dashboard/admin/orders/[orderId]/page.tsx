import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PriceTag } from "@/components/currency/PriceTag";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      clientUser: true,
      candidates: { include: { teammate: true }, orderBy: { invitedAt: "asc" } },
      games: { orderBy: { gameNumber: "asc" } },
      review: true,
    },
  });
  if (!order) notFound();
  const selected = order.candidates.find((candidate) => candidate.selected);
  const conversationKey = selected ? `${selected.teammateId}::${order.customerLabel}` : null;
  const messages = conversationKey ? await prisma.conversationMessage.findMany({
    where: { conversationKey }, orderBy: { createdAt: "asc" }, take: 500,
  }) : [];

  return <div className="admin-order-detail">
    <Link href="/dashboard/admin/orders" className="admin-order-detail__back"><i className="fa-solid fa-arrow-left" /> Back to orders</Link>
    <div className="dashboard-panel">
      <div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Order #{order.id.slice(-6)}</div><div className="dashboard-panel__sub">Created {new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(order.createdAt)}</div></div><span className="dashboard-pill dashboard-pill--muted">{order.status.toLowerCase().replaceAll("_", " ")}</span></div>
      <dl className="admin-order-facts">
        <div><dt>Client</dt><dd>{order.clientUser?.name || order.clientUser?.email || order.customerLabel}</dd></div>
        <div><dt>Game</dt><dd>{order.gameName} · {order.option}</dd></div>
        <div><dt>Value</dt><dd><PriceTag amountEUR={Number(order.priceEUR)} /></dd></div>
        <div><dt>Games</dt><dd>{order.games.length} / {order.gamesBooked}</dd></div>
        <div><dt>Session status</dt><dd>{order.sessionStatus?.toLowerCase().replaceAll("_", " ") || "Not started"}</dd></div>
        <div><dt>Selected teammate</dt><dd>{selected?.teammate.name ?? "None"}</dd></div>
      </dl>
    </div>

    <div className="dashboard-panel">
      <div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Session chat</div><div className="dashboard-panel__sub">Read-only moderation view · {messages.length} messages</div></div></div>
      {!conversationKey ? <div className="dashboard-empty dashboard-empty--compact"><p>No teammate has been selected for this order.</p></div> : messages.length === 0 ? <div className="dashboard-empty dashboard-empty--compact"><i className="fa-regular fa-comments" /><p>No persisted chat messages yet.</p></div> :
        <div className="admin-chat-log">{messages.map((message) => <article key={message.id} className={`admin-chat-message admin-chat-message--${message.sender}`}><div><strong>{message.sender === "client" ? (order.clientUser?.name || order.customerLabel) : selected?.teammate.name}</strong><time>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(message.createdAt)}</time></div><p>{message.text}</p></article>)}</div>}
    </div>

    <div className="dashboard-panel">
      <div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Candidates & game reports</div><div className="dashboard-panel__sub">Dispatch audit and submitted results</div></div></div>
      <div className="admin-order-audit"><section><h3>Candidates</h3>{order.candidates.map((candidate) => <div key={candidate.id}><span>{candidate.teammate.name}</span><strong>{candidate.status.toLowerCase()}{candidate.selected ? " · selected" : ""}</strong></div>)}</section><section><h3>Games</h3>{order.games.length ? order.games.map((game) => <div key={game.id}><span>Game {game.gameNumber}</span><strong>{game.result}</strong></div>) : <p>No game reports.</p>}</section></div>
    </div>
  </div>;
}
