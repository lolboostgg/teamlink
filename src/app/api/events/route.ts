import { auth } from "@/auth";
import { subscribe, isForViewer } from "@/lib/events/bus";
import { authorizeCustomerOrder } from "@/lib/orderAccess";

export const dynamic = "force-dynamic";
// Streaming needs the Node runtime — the bus holds a real pg connection.
export const runtime = "nodejs";

const HEARTBEAT_MS = 25_000;

/**
 * Server-sent events for everything the dashboards used to poll for.
 *
 * Each message is a signal, not data: `{"topic":"orders"}` means "re-fetch
 * your orders". The client then goes through the same authorized endpoint it
 * always did, so this stream never becomes a second place where access rules
 * have to be right.
 *
 * WebSockets would need a custom server (`next start` doesn't handle HTTP
 * upgrades) for traffic that is entirely server→client. SSE also reconnects
 * on its own, which the browser handles for us.
 */
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const url = new URL(request.url);
  const guestOrderId = url.searchParams.get("order");
  const guestToken = url.searchParams.get("token");
  const guestOrder = !userId && guestOrderId
    ? await authorizeCustomerOrder(guestOrderId, guestToken)
    : null;
  if (!userId && !guestOrder) return new Response("Not signed in.", { status: 401 });
  const isAdmin = session?.user?.role === "ADMIN";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Two questions, not one. "May we still write?" and "has the heartbeat
      // been stopped and the bus handler taken off?" are different, and a
      // single flag answered both with the first one's answer: a failed
      // enqueue set it, and cleanup() — which opens by returning early if it
      // is set — then had nothing left to do. So a consumer that vanished
      // without an abort left its 25s interval running and its listener on
      // the emitter for the life of the process, one pair per dropped
      // stream, on a connection the browser reopens every three seconds.
      let writable = true;
      let torndown = false;
      // Declared up here, and checked before use, because send() can call
      // cleanup() and the very first send happens before either of these
      // exists. As consts declared further down they sat in the temporal dead
      // zone at that moment, so a first enqueue that failed threw a
      // ReferenceError out of start() rather than tearing down — which errors
      // the stream, and the browser then reopens it every three seconds.
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let unsubscribe: (() => void) | undefined;

      function cleanup() {
        if (torndown) return;
        torndown = true;
        writable = false;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      }

      function send(payload: string) {
        if (!writable) return;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // The consumer went away between the check and the enqueue. This is
          // the only notice we get when abort never fires, so it has to do
          // the tearing down rather than just noting it.
          writable = false;
          cleanup();
        }
      }

      // Tells the browser to wait 3s before reconnecting, and gives proxies
      // something to flush so the connection is established immediately.
      send("retry: 3000\n\n");

      unsubscribe = subscribe((event) => {
        const forGuestOrder = Boolean(
          guestOrder &&
          ((event.topic === "orders" && event.key === guestOrder.id) ||
            (event.topic === "chat" && event.key?.startsWith(`${guestOrder.id}::`))),
        );
        if (userId ? !isForViewer(event, userId, isAdmin) : !forGuestOrder) return;
        send(`event: change\ndata: ${JSON.stringify({ topic: event.topic, key: event.key })}\n\n`);
      });

      // Without traffic, an idle proxy will drop the connection well before
      // anything happens on a quiet account.
      heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);

      // If the request aborted while we were setting up, the event never
      // fires again and this would be a stream nobody ever tears down.
      if (request.signal.aborted) cleanup();
      else request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx buffers streamed responses by default, which would hold every
      // event until the buffer fills.
      "X-Accel-Buffering": "no",
    },
  });
}
