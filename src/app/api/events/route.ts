import { auth } from "@/auth";
import { subscribe, isForViewer } from "@/lib/events/bus";

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
  if (!userId) return new Response("Not signed in.", { status: 401 });
  const isAdmin = session.user.role === "ADMIN";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      function send(payload: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // The consumer went away between the check and the enqueue.
          closed = true;
        }
      }

      // Tells the browser to wait 3s before reconnecting, and gives proxies
      // something to flush so the connection is established immediately.
      send("retry: 3000\n\n");

      const unsubscribe = subscribe((event) => {
        if (!isForViewer(event, userId, isAdmin)) return;
        send(`event: change\ndata: ${JSON.stringify({ topic: event.topic, key: event.key })}\n\n`);
      });

      // Without traffic, an idle proxy will drop the connection well before
      // anything happens on a quiet account.
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);

      function cleanup() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      }

      request.signal.addEventListener("abort", cleanup);
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
