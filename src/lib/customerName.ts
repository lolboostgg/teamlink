/**
 * What a teammate is allowed to see the customer called.
 *
 * A guest checks out with an email address and nothing else, so that address
 * became the order's customerLabel and was shown to whoever took the order —
 * handing a stranger a real, working email for someone who never agreed to
 * share it. A signed-in customer has a display name, which is theirs to
 * choose and fine to show.
 *
 * The replacement is derived from the order number rather than stored: it is
 * stable for the life of the order (the same person is the same "Guest#4312"
 * in the chat, the order room and any support conversation about it), needs
 * no column, and works for orders that already exist.
 *
 * Admins are deliberately not routed through this — they need the address to
 * answer a refund question.
 */
export function publicCustomerName(input: {
  customerLabel: string;
  /** Null for a guest order. */
  clientUserId: string | null;
  orderNo: number;
}): string {
  // An account's own name is theirs to show. Their email can still end up in
  // the label when they never set a name, so it goes through the same check.
  if (input.clientUserId && !looksLikeEmail(input.customerLabel)) return input.customerLabel;
  if (!looksLikeEmail(input.customerLabel) && input.customerLabel.trim() !== "") return input.customerLabel;
  return guestAlias(input.orderNo);
}

/** Four digits, so it reads as a handle rather than a database id. */
export function guestAlias(orderNo: number): string {
  return `Guest#${1000 + (Math.abs(orderNo) % 9000)}`;
}

function looksLikeEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}
