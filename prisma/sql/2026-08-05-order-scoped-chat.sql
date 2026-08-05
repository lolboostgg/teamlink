-- Chat threads move from one-per-pair to one-per-order.
--
-- Keys used to be "<teammateId>::<customerLabel>", so every booking between
-- the same two people reopened the previous conversation — a teammate saw the
-- last session's chat the moment a new order landed. They are now
-- "<orderId>::<teammateId>" (see lib/matchmaking/chatStore.ts).
--
-- Existing messages are rebased onto the order that was actually running when
-- they were written: the candidate pairing that matches the old key, whose
-- order started closest before the message. Messages whose old key no longer
-- matches any selected candidate (guest bookings, deleted orders) keep their
-- key and simply stop being addressed by the app.
--
-- Idempotent: after the rewrite a key's first segment is an order id, which
-- can never equal "<teammateId>::<customerLabel>" again, so a second run
-- matches nothing.

UPDATE "ConversationMessage" AS m
SET "conversationKey" = rebased.new_key
FROM (
  SELECT msg.id AS message_id, (target."orderId" || '::' || target."teammateId") AS new_key
  FROM "ConversationMessage" AS msg
  JOIN LATERAL (
    SELECT c."orderId", c."teammateId"
    FROM "DispatchCandidate" AS c
    JOIN "Order" AS o ON o.id = c."orderId"
    WHERE c.selected
      AND msg."conversationKey" = c."teammateId" || '::' || o."customerLabel"
    ORDER BY (o."createdAt" <= msg."createdAt") DESC,
             ABS(EXTRACT(EPOCH FROM (o."createdAt" - msg."createdAt"))) ASC
    LIMIT 1
  ) AS target ON TRUE
) AS rebased
WHERE m.id = rebased.message_id;
