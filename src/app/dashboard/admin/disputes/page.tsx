import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/access";
import { resolveDispute, updateDispute, replyAsAdmin } from "./actions";
import { DashboardSelect } from "@/components/dashboard/DashboardSelect";

export const metadata: Metadata = { title: "Disputes" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function DisputesPage() {
  await requireAdmin("support");
  const [disputes, admins] = await Promise.all([
    prisma.dispute.findMany({ include: { notes: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, email: true } }),
  ]);
  const orderIds = disputes.flatMap((item) => item.orderId ? [item.orderId] : []);
  const orders = await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true, gameName: true, status: true, games: { select: { id: true } }, _count: { select: { candidates: true } } } });
  const orderMap = new Map(orders.map((order) => [order.id, order]));

  return <section className="dashboard-panel admin-ops-page">
    <div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Disputes &amp; tickets</div><div className="dashboard-panel__sub">Order context, the conversation with the reporter, internal notes and financial resolution</div></div></div>
    <div className="admin-ticket-list">{disputes.map((item) => {
      const order = item.orderId ? orderMap.get(item.orderId) : null;
      // One table holds both, split by `internal`: the thread is what the
      // reporter can see, the notes are what only this page ever shows.
      const thread = item.notes.filter((note) => !note.internal);
      const internal = item.notes.filter((note) => note.internal);
      const waitingOnUs = thread.length > 0 && thread[thread.length - 1].authorRole !== "ADMIN";

      return <article className="admin-ticket" key={item.id}>
        <header><div>
          <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status.replace("_", " ").toLowerCase()}</span>
          {/* The one thing that decides what an admin does next: has the
              reporter said something nobody has answered yet. */}
          {waitingOnUs && <span className="admin-ticket__flag"><i className="fa-solid fa-reply" aria-hidden="true"/> Awaiting your reply</span>}
          {item.closedByReporter && <span className="admin-ticket__flag admin-ticket__flag--muted"><i className="fa-solid fa-user-check" aria-hidden="true"/> Closed by reporter</span>}
          <h3>{item.title}</h3>
        </div><time>{dateFormat.format(item.createdAt)}</time></header>

        {order && <div className="admin-ticket__context">Order #{order.orderNo} · {order.gameName} · {order.status} · {order._count.candidates} candidates · {order.games.length} game reports <span className="admin-ticket__links"><Link href={`/dashboard/admin/orders/${order.id}`}>Order &amp; reports</Link><Link href={`/dashboard/admin/chat?q=${order.orderNo}`}>Linked chat</Link></span></div>}

        <ol className="ticket-thread ticket-thread--admin">
          <li className="ticket-message ticket-message--reporter">
            <div className="ticket-message__meta"><strong>{item.openedByRole === "TEAMMATE" ? "Teammate" : "Customer"}</strong><time>{dateFormat.format(item.createdAt)}</time></div>
            <p>{item.description}</p>
          </li>
          {thread.map((note) => <li key={note.id} className={`ticket-message ticket-message--${note.authorRole === "ADMIN" ? "support" : "reporter"}`}>
            <div className="ticket-message__meta"><strong>{note.authorRole === "ADMIN" ? <><i className="fa-solid fa-headset" aria-hidden="true"/> Support</> : note.authorRole === "TEAMMATE" ? "Teammate" : "Customer"}</strong><time>{dateFormat.format(note.createdAt)}</time></div>
            <p>{note.body}</p>
          </li>)}
        </ol>

        {/* Its own form and its own button. This is the only control on the
            page whose text a customer reads, and a checkbox on the triage
            form would have made "internal note" and "reply to the customer"
            one mis-click apart. */}
        <div className="admin-ticket__stage admin-ticket__stage--reply">
          <span className="admin-ticket__stage-label"><i className="fa-solid fa-headset" aria-hidden="true"/> Reply — the reporter reads this, and it takes the ticket in progress</span>
          <form action={replyAsAdmin} className="admin-ticket__form"><input type="hidden" name="id" value={item.id}/><input name="body" required maxLength={3000} placeholder="Write back to the reporter…"/><button className="btn btn--vivid btn--sm">Send reply</button></form>
        </div>

        <div className="admin-ticket__stage"><span className="admin-ticket__stage-label"><i className="fa-solid fa-arrows-turn-to-dots" aria-hidden="true"/> Triage — internal only, except the status</span>
          <form action={updateDispute} className="admin-ticket__form"><input type="hidden" name="id" value={item.id}/><DashboardSelect name="status" value={item.status} label="Status" options={[{value:"PENDING",label:"Pending"},{value:"IN_PROGRESS",label:"In progress"},{value:"SOLVED",label:"Solved"}]}/><DashboardSelect name="assigneeId" value={item.assigneeId ?? ""} label="Assigned admin" options={[{value:"",label:"Unassigned"},...admins.map(a => ({value:a.id,label:a.name || a.email}))]}/><input name="note" placeholder="Internal note — never shown to the reporter…"/><button className="btn btn--ghost btn--sm">Update</button></form>
        </div>

        <div className="admin-ticket__stage admin-ticket__stage--final"><span className="admin-ticket__stage-label"><i className="fa-solid fa-gavel" aria-hidden="true"/> Resolve — pays out and closes the ticket</span>
          <form action={resolveDispute} className="admin-ticket__form"><input type="hidden" name="id" value={item.id}/><DashboardSelect name="resolution" value="REJECTED" label="Resolution" options={["REFUND","PARTIAL_REFUND","CREDIT","REJECTED","OTHER","TEAMMATE_NO_SHOW"].map(v => ({value:v,label:v.replaceAll("_", " ")}))}/><input name="amountEUR" type="number" min="0" step="0.01" placeholder="€ amount"/><input name="note" required placeholder="Resolution and reason — the reporter reads this…"/><button className="btn btn--vivid btn--sm">Resolve</button></form>
        </div>

        {!!internal.length && <details className="admin-ticket__notes"><summary>{internal.length} internal {internal.length === 1 ? "note" : "notes"}</summary>{internal.map(n => <p key={n.id}><small>{dateFormat.format(n.createdAt)}</small> {n.body}</p>)}</details>}
      </article>;
    })}{!disputes.length && <div className="empty-state">No disputes yet.</div>}</div>
  </section>;
}
