import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PriceTag } from "@/components/currency/PriceTag";
import { AvatarIcon } from "@/components/ui/AvatarIcon";
import { payoutForOrder } from "@/lib/payoutSplit";
import { AdminOrderReply } from "@/components/dashboard/admin/AdminOrderReply";
import { AdminOrderControls } from "@/components/dashboard/admin/AdminOrderControls";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  // URLs carry the human order number (#1117). The cuid still resolves, so
  // links written before the switch — notifications, bookmarks, support
  // threads — keep working.
  const orderNo = Number(orderId);
  const order = await prisma.order.findUnique({
    where: Number.isInteger(orderNo) && orderNo > 0 ? { orderNo } : { id: orderId },
    include: {
      clientUser: true,
      candidates: { include: { teammate: true }, orderBy: { invitedAt: "asc" } },
      games: { orderBy: { gameNumber: "asc" } },
      review: true,
    },
  });
  if (!order) notFound();

  const selected = order.candidates.find((candidate) => candidate.selected);
  const conversationKey = selected ? `${order.id}::${selected.teammateId}` : null;
  const messages = conversationKey ? await prisma.conversationMessage.findMany({
    where: { conversationKey }, orderBy: { createdAt: "asc" }, take: 500,
  }) : [];
  const clientName = order.clientUser?.name || order.clientUser?.email || order.customerLabel;
  const teammateName = selected?.teammate.name ?? "No teammate selected";
  const statusLabel = order.status.toLowerCase().replaceAll("_", " ");
  const dateTime = (value: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);
  // What the order pays out, and per head — the payout is the whole pot split
  // evenly across whoever actually played it, same as creditOrderPayout does.
  const selectedCount = order.candidates.filter((candidate) => candidate.selected).length;
  const payoutPot = payoutForOrder(order);
  const teammateCutEach = payoutPot / Math.max(1, selectedCount);
  // AvatarIcon falls back to the placeholder unless it is given a URL, and
  // every call on this page was passing a seed alone — so client, teammate
  // and every chat bubble drew the same default face.
  const clientAvatar = order.clientUser?.avatarUrl ?? null;
  const clientFrame = order.clientUser
    ? {
        avatarFocusX: order.clientUser.avatarFocusX,
        avatarFocusY: order.clientUser.avatarFocusY,
        avatarZoom: order.clientUser.avatarZoom,
      }
    : null;
  const teammateAvatar = selected?.teammate.avatarUrl ?? null;
  const teammateFrame = selected
    ? {
        avatarFocusX: selected.teammate.avatarFocusX,
        avatarFocusY: selected.teammate.avatarFocusY,
        avatarZoom: selected.teammate.avatarZoom,
      }
    : null;
  const statusTone = order.status === "COMPLETED" ? "success" : order.status === "CANCELLED" || order.status === "CANCEL_PENDING" ? "warning" : "accent";

  return <div className="admin-order-detail">
    <Link href="/dashboard/admin/orders" className="admin-order-detail__back"><i className="fa-solid fa-arrow-left" /> Back to orders</Link>

    <section className="dashboard-panel admin-order-hero">
      <div className="admin-order-hero__head">
        <div className="admin-order-hero__identity">
          <span className="admin-order-hero__icon"><i className="fa-solid fa-receipt" /></span>
          <div><span className="admin-order-hero__eyebrow">Order details</span><h1>#{order.orderNo}</h1><p>Created {dateTime(order.createdAt)}</p></div>
        </div>
        <span className={`admin-order-status admin-order-status--${statusTone}`}><i className={order.status === "COMPLETED" ? "fa-solid fa-check" : "fa-solid fa-circle"} />{statusLabel}</span>
      </div>
      <dl className="admin-order-facts">
        <div><span className="admin-order-fact__icon admin-order-fact__icon--face"><AvatarIcon seed={`client-${clientName}`} avatarUrl={clientAvatar} frame={clientFrame} /></span><span><dt>Client</dt><dd>{order.clientUser ? <Link href={`/dashboard/admin/accounts/${order.clientUser.accountNo}`}>{clientName}</Link> : clientName}</dd></span></div>
        <div><span className="admin-order-fact__icon admin-order-fact__icon--face">{selected ? <AvatarIcon seed={`teammate-${selected.teammateId}`} avatarUrl={teammateAvatar} frame={teammateFrame} /> : <i className="fa-solid fa-headset" />}</span><span><dt>Teammate</dt><dd>{selected ? <Link href={`/dashboard/admin/teammates/${selected.teammate.teammateNo}`}>{teammateName}</Link> : teammateName}</dd></span></div>
        <div><span className="admin-order-fact__icon"><i className="fa-solid fa-gamepad" /></span><span><dt>Game & option</dt><dd>{order.gameName}<small>{order.option}</small></dd></span></div>
        <div><span className="admin-order-fact__icon"><i className="fa-solid fa-coins" /></span><span><dt>Order value</dt><dd><PriceTag amountEUR={Number(order.priceEUR)} /><small>{selectedCount > 0 ? <>Teammate cut <PriceTag amountEUR={teammateCutEach} />{selectedCount > 1 ? ` each · ${selectedCount} teammates` : ""}</> : <>Teammate cut <PriceTag amountEUR={payoutPot} /></>}</small></dd></span></div>
      </dl>
      <div className="admin-order-session-strip">
        <div><span>Games</span><strong>{order.games.length}<small> / {order.gamesBooked}</small></strong></div>
        <div><span>{["COMPLETED", "CANCELLED", "NO_MATCH"].includes(order.status) ? "Last session status" : "Session status"}</span><strong>{order.sessionStatus?.toLowerCase().replaceAll("_", " ") || "Not started"}</strong></div>
        <div><span>Assigned</span><strong>{order.assignedAt ? dateTime(order.assignedAt) : "—"}</strong></div>
        <div><span>Completed</span><strong>{order.sessionCompleteAt ? dateTime(order.sessionCompleteAt) : "—"}</strong></div>
      </div>
    </section>

    <AdminOrderControls
      orderId={order.id}
      priceEUR={Number(order.priceEUR)}
      played={order.games.length}
      booked={Math.max(1, order.gamesBooked)}
      settled={["COMPLETED", "CANCELLED", "NO_MATCH"].includes(order.status)}
      statusLabel={statusLabel}
    />

    <div className="admin-order-workspace">
    <section className="dashboard-panel admin-order-chat-panel">
      <div className="dashboard-panel__head">
        <div><div className="dashboard-panel__title"><i className="fa-solid fa-comments" /> Session chat</div><div className="dashboard-panel__sub">Conversation preview · {messages.length} messages</div></div>
        <Link className="admin-order-chat__reply" href={`/dashboard/admin/chat?conversation=${encodeURIComponent(conversationKey ?? "")}`}><i className="fa-solid fa-reply" /> Open & reply</Link>
      </div>
      {!conversationKey ? <div className="dashboard-empty dashboard-empty--compact"><p>No teammate has been selected for this order.</p></div> : <div className="admin-order-chat">
        <header className="admin-order-chat__head">
          <div className="admin-order-chat__person"><span className="chat-list__avatar"><AvatarIcon seed={`client-${clientName}`} avatarUrl={clientAvatar} frame={clientFrame} /></span><span><small>Client</small><strong>{clientName}</strong></span></div>
          <div className="admin-order-chat__connection"><span /><strong>#{order.orderNo}</strong><span /></div>
          <div className="admin-order-chat__person admin-order-chat__person--teammate"><span><small>Teammate</small><strong>{teammateName}</strong></span><span className="chat-list__avatar"><AvatarIcon seed={`teammate-${selected?.teammateId ?? "none"}`} avatarUrl={teammateAvatar} frame={teammateFrame} /></span></div>
        </header>
        <div className="admin-order-chat__messages">
          {messages.length === 0 && <div className="chat-thread__empty"><i className="fa-regular fa-comments" /><p>No persisted chat messages yet.</p></div>}
          {messages.map((message) => {
            const fromTeammate = message.sender === "teammate";
            const fromAdmin = message.sender === "admin";
            const senderName = fromAdmin ? "Admin" : fromTeammate ? teammateName : clientName;
            return <article key={message.id} className={`admin-order-chat__message${fromTeammate || fromAdmin ? " admin-order-chat__message--teammate" : ""}`}>
              {!fromTeammate && !fromAdmin && <span className="admin-order-chat__avatar"><AvatarIcon seed={`client-${clientName}`} avatarUrl={clientAvatar} frame={clientFrame} /></span>}
              <div><header><strong>{senderName}</strong><span>{fromAdmin ? "Admin" : fromTeammate ? "Teammate" : "Client"}</span></header><p>{message.text}</p><time>{dateTime(message.createdAt)}</time></div>
              {(fromTeammate || fromAdmin) && <span className="admin-order-chat__avatar">{fromAdmin ? <i className="fa-solid fa-shield-halved" /> : <AvatarIcon seed={`teammate-${selected?.teammateId ?? "none"}`} avatarUrl={teammateAvatar} frame={teammateFrame} />}</span>}
            </article>;
          })}
        </div>
        <AdminOrderReply conversationKey={conversationKey} orderNo={order.orderNo} />
      </div>}
    </section>

    <section className="dashboard-panel admin-order-audit-panel">
      <div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Candidates & game reports</div><div className="dashboard-panel__sub">Dispatch audit and submitted results</div></div></div>
      <div className="admin-order-audit">
        <section><h3><i className="fa-solid fa-users" /> Candidates <span>{order.candidates.length}</span></h3>{order.candidates.map((candidate) => <div key={candidate.id}><span><AvatarIcon seed={candidate.teammateId} avatarUrl={candidate.teammate.avatarUrl} frame={{ avatarFocusX: candidate.teammate.avatarFocusX, avatarFocusY: candidate.teammate.avatarFocusY, avatarZoom: candidate.teammate.avatarZoom }} />{candidate.teammate.name}</span><strong className={candidate.selected ? "is-selected" : ""}>{candidate.status.toLowerCase()}{candidate.selected ? " · selected" : ""}</strong></div>)}</section>
        <section><h3><i className="fa-solid fa-trophy" /> Game reports <span>{order.games.length}/{order.gamesBooked}</span></h3>{order.games.length ? order.games.map((game) => <div key={game.id}><span>Game {game.gameNumber}</span><strong className={`game-result game-result--${game.result.toLowerCase()}`}>{game.result}</strong></div>) : <p>No game reports.</p>}</section>
      </div>
    </section>
    </div>
  </div>;
}
