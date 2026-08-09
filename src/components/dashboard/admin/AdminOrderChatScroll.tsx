"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The order page's chat transcript, parked on the newest message.
 *
 * The panel around it is server-rendered, so nothing was scrolling it: the
 * box opened at the top of the conversation and an admin reading a long order
 * had to scroll to the bottom by hand to see what was actually just said. The
 * box also grew with the transcript until it hit its max-height, which meant
 * the rest of the page moved depending on how chatty an order had been.
 *
 * Two rAFs, not one: the first still lands mid-layout and scrolls to the
 * previous, shorter height. The ResizeObserver catches whatever settles late —
 * an avatar finishing its load is the usual one.
 */
export function AdminOrderChatScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const toBottom = () => {
      element.scrollTop = element.scrollHeight;
    };
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(toBottom);
    });
    const observer = new ResizeObserver(toBottom);
    observer.observe(element);

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="admin-order-chat__messages" ref={ref}>
      {children}
    </div>
  );
}
