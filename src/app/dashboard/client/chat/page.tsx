import type { Metadata } from "next";
import { ClientChatContent } from "@/components/dashboard/client/ClientChatContent";

export const metadata: Metadata = { title: "Chat" };

export default function ClientChatPage() {
  return <ClientChatContent />;
}
