export interface SignupRow {
  id: string;
  name: string;
  email: string;
  joined: string;
  role: "client" | "teammate";
}

export interface TicketRow {
  id: string;
  subject: string;
  user: string;
  status: "open" | "pending" | "resolved";
  priority: "low" | "medium" | "high";
}

export interface PayoutRequest {
  id: string;
  teammate: string;
  amountEUR: number;
  status: "pending" | "approved" | "paid";
}

export const ADMIN_STATS = {
  gmvEUR: 48_920.5,
  activeBookings: 63,
  totalUsers: 9_842,
  pendingApprovals: 7,
};

export const RECENT_SIGNUPS: SignupRow[] = [
  { id: "u-3391", name: "Mara Feld", email: "mara.f@example.com", joined: "2026-08-01", role: "client" },
  { id: "u-3390", name: "Deniz Aksoy", email: "deniz.a@example.com", joined: "2026-07-31", role: "teammate" },
  { id: "u-3388", name: "Yuki Tanaka", email: "yuki.t@example.com", joined: "2026-07-31", role: "client" },
  { id: "u-3385", name: "Owen Brooks", email: "owen.b@example.com", joined: "2026-07-30", role: "client" },
  { id: "u-3381", name: "Sofia Reyes", email: "sofia.r@example.com", joined: "2026-07-29", role: "teammate" },
];

export const SUPPORT_TICKETS: TicketRow[] = [
  { id: "tk-812", subject: "Refund for cancelled session", user: "Mara Feld", status: "open", priority: "high" },
  { id: "tk-809", subject: "Teammate no-show", user: "Owen Brooks", status: "pending", priority: "high" },
  { id: "tk-804", subject: "Payment method update", user: "Yuki Tanaka", status: "resolved", priority: "low" },
  { id: "tk-799", subject: "Account verification", user: "Deniz Aksoy", status: "pending", priority: "medium" },
];

export const PAYOUT_QUEUE: PayoutRequest[] = [
  { id: "po-451", teammate: "Nova", amountEUR: 312.4, status: "pending" },
  { id: "po-450", teammate: "Kestrel", amountEUR: 198.0, status: "pending" },
  { id: "po-448", teammate: "Vantage", amountEUR: 87.5, status: "approved" },
  { id: "po-444", teammate: "Halcyon", amountEUR: 240.75, status: "paid" },
];
